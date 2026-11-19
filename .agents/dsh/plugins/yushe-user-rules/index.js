/**
 * yushe-user-rules — inject project rules into model context from the first
 * present rules directory: `.agents/rules`, then `.claude/rules`, then
 * `.opencode/rule`, then `.cursor/rules` (Claude Code style).
 *
 * Rule files are markdown (`.md`, or Cursor's `.mdc`). An optional YAML
 * frontmatter gate list — `paths`, or Cursor's `globs` — gates a rule: it is
 * injected only after the agent reads, writes, or edits a file matching one
 * of the globs (checked at the next model request). Cursor's
 * `alwaysApply: true` and missing frontmatter load unconditionally at the
 * session's first step. Each rule is injected at most once per session.
 *
 * Mounts on the public `agent/pre-step` waterfall and the `tools/result`
 * event. The agent loop logs injected messages as `user/message`, so no extra
 * persistence work is needed here.
 *
 * Plain ESM with Node-built-in imports only: installed via `dsh plugin add`
 * as a `link:` dependency, whose own dependencies would not be installed, so
 * bare imports must be avoided.
 */

import { randomUUID } from 'node:crypto'
import { readdir, readFile, stat } from 'node:fs/promises'
import { dirname, isAbsolute, join, relative, resolve, sep } from 'node:path'

export const name = 'yushe-user-rules'
const SOURCE_KIND = 'yushe-user-rules'
const LEGACY_SOURCE_KIND = 'plugin:yushe-user-rules'

/**
 * Candidate rules roots, highest priority first. The first root that yields
 * at least one rule file wins; later roots are not read. An existing but
 * empty root does not win, so a `.claude/` created for settings alone does
 * not block the OpenCode or Cursor tiers.
 */
const RULES_ROOTS = ['.agents/rules', '.claude/rules', '.opencode/rule', '.cursor/rules']
/** Maximum UTF-8 bytes of one rendered rules message. */
const MAX_TOTAL_BYTES = 65536
/** Bytes reserved for the frame, intro, and budget marker below the total cap. */
const FRAME_SLACK_BYTES = 512
/** Maximum UTF-8 bytes read from one rules file; larger files are omitted. */
const MAX_FILE_BYTES = 1048576
/** Tool executions whose `file_path` argument counts as a path touch. */
const TOUCH_TOOLS = new Set(['read', 'write', 'edit'])

const FRAME_CLOSE = '</system-reminder>'
const FRAME_CLOSE_ESCAPED = '<\\/system-reminder>'
const INTRO = 'The following project rules come from the project root\'s rules directory '
  + `(checked in priority order: ${RULES_ROOTS.join(', ')}; first present wins). `
  + 'Use them as guidance when applicable. They do not override system, developer, or direct user instructions.'

function isAbsentError(error) {
  return typeof error === 'object' && error !== null && 'code' in error
    && (error.code === 'ENOENT' || error.code === 'ENOTDIR')
}

function isAbortError(error, signal) {
  return signal?.aborted === true || error?.name === 'AbortError'
}

async function pathExists(path) {
  try {
    await stat(path)
    return true
  } catch (error) {
    if (isAbsentError(error)) return false
    throw error
  }
}

/** Walk upward from `cwd` to the closest directory containing `.git`. */
async function findProjectRoot(cwd) {
  let current = resolve(cwd)
  for (;;) {
    if (await pathExists(join(current, '.git'))) return current
    const parent = dirname(current)
    if (parent === current) return resolve(cwd)
    current = parent
  }
}

/** Rule file extensions: markdown everywhere, plus Cursor's `.mdc`. */
function isRuleFileName(fileName) {
  return fileName.endsWith('.md') || fileName.endsWith('.mdc')
}

/**
 * Collect rule files under one rules root, following file symlinks but
 * skipping directory symlinks (loop safety) and hidden or vendored
 * directories (`node_modules`).
 */
async function collectRuleFiles(dir, out) {
  let entries
  try {
    entries = await readdir(dir, { withFileTypes: true })
  } catch (error) {
    if (isAbsentError(error)) return
    throw error
  }
  for (const entry of entries) {
    const path = join(dir, entry.name)
    if (entry.isDirectory()) {
      if (!entry.name.startsWith('.') && entry.name !== 'node_modules') {
        await collectRuleFiles(path, out)
      }
      continue
    }
    if (!isRuleFileName(entry.name)) continue
    if (entry.isFile()) {
      out.push(path)
      continue
    }
    if (entry.isSymbolicLink()) {
      try {
        if ((await stat(path)).isFile()) out.push(path)
      } catch {
        // A broken or unreadable link is skipped like an absent file.
      }
    }
  }
}

function unquote(value) {
  if (value.length >= 2 && ((value.startsWith('"') && value.endsWith('"'))
    || (value.startsWith("'") && value.endsWith("'")))) {
    return value.slice(1, -1)
  }
  return value
}

/** Split a comma list on top-level commas, honoring quotes and brace depth. */
function splitCommaList(text) {
  const items = []
  let current = ''
  let quote
  let depth = 0
  for (const ch of text) {
    if (quote !== undefined) {
      current += ch
      if (ch === quote) quote = undefined
    } else if (ch === '"' || ch === "'") {
      quote = ch
      current += ch
    } else if (ch === '{' || ch === '[') {
      depth += 1
      current += ch
    } else if (ch === '}' || ch === ']') {
      depth = Math.max(0, depth - 1)
      current += ch
    } else if (ch === ',' && depth === 0) {
      items.push(current)
      current = ''
    } else {
      current += ch
    }
  }
  items.push(current)
  return items.map(item => unquote(item.trim())).filter(item => item.length > 0)
}

/**
 * Extract the frontmatter gate list from YAML text. The `paths` key is the
 * native form; Cursor's `globs` key is accepted as an alias whose bare scalar
 * may be a comma-separated list. Supported shapes: inline array, single
 * scalar, and block dash lists. Other keys are ignored. @returns whether a
 * gate key is present and its string list.
 */
function parsePathsField(yamlText) {
  const lines = yamlText.split(/\r?\n/)
  for (let i = 0; i < lines.length; i += 1) {
    const match = lines[i].match(/^\s*(paths|globs)\s*:\s*(.*)$/)
    if (match === null) continue
    const inline = match[2].trim()
    if (inline.length > 0) {
      if (inline.startsWith('[')) {
        const inner = inline.replace(/^\[/, '').replace(/\]$/, '').trim()
        if (inner.length === 0) return { present: true, globs: [] }
        return { present: true, globs: splitCommaList(inner) }
      }
      if (match[1] === 'globs') {
        // Cursor allows a bare comma-separated scalar for its globs key.
        return { present: true, globs: splitCommaList(inline) }
      }
      return { present: true, globs: [unquote(inline)] }
    }
    const globs = []
    for (let j = i + 1; j < lines.length; j += 1) {
      const item = lines[j].match(/^\s+-\s*(.*)$/)
      if (item === null) break
      const value = unquote(item[1].trim())
      if (value.length > 0) globs.push(value)
    }
    return { present: true, globs }
  }
  return { present: false, globs: undefined }
}

/**
 * Whether the frontmatter sets a boolean key to true; Cursor's
 * `alwaysApply: true` forces unconditional loading.
 */
function parseBooleanTrue(yamlText, key) {
  for (const line of yamlText.split(/\r?\n/)) {
    const match = line.match(new RegExp(`^\\s*${key}\\s*:\\s*(.*)$`))
    if (match === null) continue
    return unquote(match[1].trim()).toLowerCase() === 'true'
  }
  return false
}

/**
 * Split a leading `---` YAML frontmatter block. @returns the block's YAML
 * text (without markers) and the body; both empty/absent when no block.
 */
function splitFrontmatter(raw) {
  if (!raw.startsWith('---\n') && !raw.startsWith('---\r\n')) return { yaml: undefined, body: raw }
  let lineStart = raw.indexOf('\n') + 1
  while (lineStart <= raw.length) {
    const nextNewline = raw.indexOf('\n', lineStart)
    const lineEnd = nextNewline < 0 ? raw.length : nextNewline
    const line = raw.slice(lineStart, lineEnd).replace(/\r$/, '')
    if (line === '---') {
      return {
        yaml: raw.slice(raw.indexOf('\n') + 1, lineStart - 1),
        body: raw.slice(nextNewline < 0 ? raw.length : nextNewline + 1),
      }
    }
    if (nextNewline < 0) return { yaml: undefined, body: raw }
    lineStart = nextNewline + 1
  }
  return { yaml: undefined, body: raw }
}

const globCache = new Map()

function escapeLiteral(ch) {
  return /[.*+?^${}()|[\]\\]/.test(ch) ? `\\${ch}` : ch
}

/**
 * Compile one glob to a RegExp over project-relative POSIX paths. Supported:
 * a double-star segment (any number of directories, zero included when it
 * precedes a slash), single-star within one segment, a single-character
 * wildcard, brace alternations, and bracket character classes. No negation
 * or extglobs.
 */
function compileGlob(pattern) {
  let compiled = globCache.get(pattern)
  if (compiled === undefined) {
    compiled = new RegExp(`^${compileGlobSource(pattern)}$`)
    globCache.set(pattern, compiled)
  }
  return compiled
}

/** Compile a glob to an unanchored RegExp source. */
function compileGlobSource(pattern) {
  let source = ''
  let i = 0
  while (i < pattern.length) {
    const ch = pattern[i]
    if (ch === '{') {
      const close = pattern.indexOf('}', i)
      if (close < 0) {
        source += escapeLiteral(ch)
        i += 1
        continue
      }
      const alternatives = pattern.slice(i + 1, close)
        .split(',')
        .map(alternative => compileGlobSource(alternative))
      source += `(?:${alternatives.join('|')})`
      i = close + 1
      continue
    }
    if (ch === '[') {
      const close = pattern.indexOf(']', i + 1)
      if (close < 0) {
        source += escapeLiteral(ch)
        i += 1
        continue
      }
      let body = pattern.slice(i + 1, close)
      let negated = ''
      if (body.startsWith('!')) {
        negated = '^'
        body = body.slice(1)
      }
      body = body.replace(/\\/g, '\\\\').replace(/\^/g, '\\^')
      source += `[${negated}${body}]`
      i = close + 1
      continue
    }
    if (ch === '*') {
      let j = i + 1
      while (pattern[j] === '*') j += 1
      if (j > i + 1) {
        if (pattern[j] === '/') {
          // A `**/` boundary matches zero or more whole segments.
          source += '(?:[^/]*/)*'
          i = j + 1
        } else {
          source += '.*'
          i = j
        }
        continue
      }
      source += '[^/]*'
      i += 1
      continue
    }
    if (ch === '?') {
      source += '[^/]'
      i += 1
      continue
    }
    source += escapeLiteral(ch)
    i += 1
  }
  return source
}

/** One parsed rules file; `matchers` is `undefined` for ungated rules. */
function parseRuleFile(root, path, raw, warn) {
  const { yaml, body } = splitFrontmatter(raw)
  const content = body.trim()
  if (content.length === 0) return undefined
  let globs
  if (yaml !== undefined) {
    if (parseBooleanTrue(yaml, 'alwaysApply')) {
      globs = undefined
    } else {
      const parsed = parsePathsField(yaml)
      if (parsed.present) {
        try {
          globs = parsed.globs.map(pattern => compileGlob(pattern))
        } catch (error) {
          // An uncompilable glob must not silently hide the rule; load it
          // unconditionally and say so.
          warn(`yushe-user-rules: paths glob in ${relative(root, path)} failed to compile (${String(error)}); rule loads unconditionally`)
          globs = undefined
        }
      }
    }
  }
  const displayPath = relative(root, path)
  return {
    displayPath,
    relPath: displayPath.split(sep).join('/'),
    body: content,
    globs,
  }
}

/** Discover and parse every rule file for one project. @returns parsed rules. */
export async function scanRules(cwd, signal, warn) {
  let root
  try {
    root = await findProjectRoot(cwd)
  } catch (error) {
    warn(`yushe-user-rules: failed to locate project root: ${String(error)}`)
    return { root: resolve(cwd), rules: [] }
  }
  const files = []
  for (const dir of RULES_ROOTS) {
    const collected = []
    try {
      await collectRuleFiles(join(root, dir), collected)
    } catch (error) {
      warn(`yushe-user-rules: failed to scan ${dir}: ${String(error)}`)
    }
    // First-match-wins: stop before consulting lower-priority roots.
    if (collected.length > 0) {
      files.push(...collected)
      break
    }
  }
  files.sort()
  const rules = []
  for (const path of files) {
    let raw
    try {
      raw = await readFile(path, { encoding: 'utf8', signal })
    } catch (error) {
      if (isAbortError(error, signal)) return { root, rules }
      warn(`yushe-user-rules: failed to read ${path}: ${String(error)}`)
      continue
    }
    if (Buffer.byteLength(raw, 'utf8') > MAX_FILE_BYTES) continue
    const rule = parseRuleFile(root, path, raw, warn)
    if (rule !== undefined) rules.push(rule)
  }
  return { root, rules }
}

/**
 * Discover and parse rule files under one explicit directory (no project-root
 * walk). Used by embedders that keep rules outside the project, such as the
 * kit package's own `.agents/rules`. @returns parsed rules.
 */
export async function scanRulesDir(dir, signal, warn) {
  const files = []
  try {
    await collectRuleFiles(dir, files)
  } catch (error) {
    warn(`yushe-user-rules: failed to scan ${dir}: ${String(error)}`)
    return []
  }
  files.sort()
  const rules = []
  for (const path of files) {
    let raw
    try {
      raw = await readFile(path, { encoding: 'utf8', signal })
    } catch (error) {
      if (isAbortError(error, signal)) return rules
      warn(`yushe-user-rules: failed to read ${path}: ${String(error)}`)
      continue
    }
    if (Buffer.byteLength(raw, 'utf8') > MAX_FILE_BYTES) continue
    const rule = parseRuleFile(dir, path, raw, warn)
    if (rule !== undefined) rules.push(rule)
  }
  return rules
}

function escapeFrameClose(text) {
  return text.replaceAll(FRAME_CLOSE, FRAME_CLOSE_ESCAPED)
}

/**
 * Render one injection batch: `due` rules in the given order, byte-budgeted.
 * @returns framed text plus the display paths actually represented.
 */
function renderBatch(due) {
  const sections = []
  const omitted = []
  const included = []
  let usedBytes = 0
  for (const rule of due) {
    const heading = rule.globs === undefined
      ? `Rules from: ${rule.displayPath}`
      : `Rules from: ${rule.displayPath} (apply to work on files matching their paths globs)`
    const section = `${heading}\n\n${rule.body}`
    const sectionBytes = Buffer.byteLength(section, 'utf8')
    if (usedBytes + sectionBytes > MAX_TOTAL_BYTES - FRAME_SLACK_BYTES) {
      omitted.push(rule.displayPath)
      continue
    }
    usedBytes += sectionBytes
    sections.push(section)
    included.push(rule.displayPath)
  }
  if (included.length === 0) return undefined
  const parts = [INTRO, ...sections]
  if (omitted.length > 0) {
    parts.push(`Rules budget ${MAX_TOTAL_BYTES} bytes: omitted ${omitted.join(', ')}`)
  }
  return {
    text: `<system-reminder>\n${escapeFrameClose(parts.join('\n\n'))}\n${FRAME_CLOSE}`,
    included,
  }
}

/** Rule paths already carried by this session's visible history. */
async function suppliedFromHistory(session, warn, kind, legacyKind) {
  try {
    const derived = session.deriveMessages()
    const list = derived instanceof Promise ? await derived : derived
    const supplied = new Set()
    if (Array.isArray(list)) {
      for (const message of list) {
        const source = message?.source
        if (message?.role === 'user' && (source?.kind === kind || (legacyKind !== undefined && source?.kind === legacyKind))
          && Array.isArray(source.rules)) {
          for (const path of source.rules) {
            if (typeof path === 'string') supplied.add(path)
          }
        }
      }
    }
    return supplied
  } catch (error) {
    // History inspection guards against duplicate injection across restarts;
    // on failure prefer injecting over silently dropping rules.
    warn(`yushe-user-rules: could not inspect session history: ${String(error)}`)
    return new Set()
  }
}

function filePathFromExecution(exec) {
  if (!TOUCH_TOOLS.has(exec.name)) return undefined
  if (typeof exec.arguments !== 'object' || exec.arguments === null) return undefined
  if (typeof exec.arguments.file_path !== 'string') return undefined
  const filePath = exec.arguments.file_path.trim()
  return filePath.length > 0 ? filePath : undefined
}

/**
 * Stateful rules injection shared by this plugin and embedders (the kit
 * package plugin). `loadRules(cwd, signal, warn)` resolves the rules visible
 * from a session cwd; each rule injects at most once per session, and
 * `paths`-gated rules wait for a matching file touch.
 */
export function makeRuleInjector(ctx, { sourceKind = SOURCE_KIND, legacySourceKind, loadRules = scanRules } = {}) {
  const warn = message => ctx.logger?.warn(message)
  const sessions = new WeakMap()

  const stateOf = session => {
    let state = sessions.get(session)
    if (state === undefined) {
      state = {
        cwd: session.header?.cwd ?? process.cwd(),
        rules: undefined,
        historyScanned: false,
        supplied: new Set(),
        pending: new Set(),
      }
      sessions.set(session, state)
    }
    return state
  }

  const ensureRules = async (state, signal) => {
    if (state.rules === undefined) {
      const { root, rules } = await loadRules(state.cwd, signal, warn)
      state.root = root
      state.rules = rules
    }
    return state.rules
  }

  ctx.on('tools/result', (exec, result) => {
    if (result.isError || exec.agent === undefined || exec.signal?.aborted) return
    const filePath = filePathFromExecution(exec)
    if (filePath === undefined) return
    const state = stateOf(exec.agent.session)
    const rules = state.rules ?? undefined
    if (rules === undefined) {
      // Discovery is deferred to the first pre-step; touches before it only
      // matter once rules are known, and pre-step follows before the next
      // request anyway.
      return
    }
    const relPath = relative(state.root, resolve(state.cwd, filePath))
    if (relPath.length === 0 || relPath === '..' || relPath.startsWith(`..${sep}`) || isAbsolute(relPath)) return
    const posix = relPath.split(sep).join('/')
    for (const rule of rules) {
      if (rule.globs === undefined || state.supplied.has(rule.displayPath) || state.pending.has(rule.displayPath)) continue
      if (rule.globs.some(matcher => matcher.test(posix))) state.pending.add(rule.displayPath)
    }
  })

  ctx.on('agent/pre-step', async ({ agent, messages, signal }, next) => {
    const decision = await next()
    if (decision.kind !== 'enter' || decision.messages.length === 0) return decision
    const session = agent?.session
    if (session === undefined) return decision
    const state = stateOf(session)
    if (!state.historyScanned) {
      state.supplied = await suppliedFromHistory(session, warn, sourceKind, legacySourceKind)
      state.historyScanned = true
    }
    const rules = await ensureRules(state, signal)
    if (rules.length === 0 && state.pending.size === 0) return decision
    const byPath = new Map(rules.map(rule => [rule.displayPath, rule]))
    const due = [
      ...rules.filter(rule => rule.globs === undefined && !state.supplied.has(rule.displayPath)),
      ...[...state.pending].flatMap(path => {
        const rule = byPath.get(path)
        return rule !== undefined && !state.supplied.has(rule.displayPath) ? [rule] : []
      }),
    ]
    if (due.length === 0) return decision
    const batch = renderBatch(due)
    state.pending.clear()
    // Mark the whole batch supplied so budget-omitted rules do not retry on
    // every following step.
    for (const rule of due) state.supplied.add(rule.displayPath)
    if (batch === undefined) return decision
    const desired = Object.freeze({
      id: randomUUID(),
      role: 'user',
      content: Object.freeze([{ type: 'text', text: batch.text }]),
      source: Object.freeze({ kind: sourceKind, rules: Object.freeze([...batch.included]) }),
    })
    // Splice after the last claimed message so the direct prompt prefix stays
    // stable for KV caching.
    const last = decision.messages.findLastIndex(message => messages.includes(message))
    const at = last >= 0 ? last + 1 : decision.messages.length
    return { ...decision, messages: decision.messages.toSpliced(at, 0, desired) }
  })
}

/**
 * Register baseline and path-gated project rules injection. Rules are
 * supplied at most once per session; edits mid-session apply to the next
 * session.
 */
export function apply(ctx) {
  makeRuleInjector(ctx, { sourceKind: SOURCE_KIND, legacySourceKind: LEGACY_SOURCE_KIND, loadRules: scanRules })
}
