/**
 * Rule discovery and parsing. Two entries:
 * - `scanRules(cwd)` — project rules: walk to the project root, then read
 *   the first present rules root (`.agents` > `.claude` > `.opencode` >
 *   `.cursor`, first present wins);
 * - `scanRulesDir(dir)` — one explicit directory, no project walk (used for
 *   the kit package's own `.agents/rules` defaults).
 */
import { readdir, readFile, stat } from 'node:fs/promises'
import { dirname, isAbsolute, join, relative, resolve, sep } from 'node:path'
import { parseBooleanTrue, parsePathsField, splitFrontmatter } from './frontmatter.js'
import { compileGlob } from './glob.js'

/**
 * Candidate rules roots, highest priority first. The first root that yields
 * at least one rule file wins; later roots are not read. An existing but
 * empty root does not win, so a `.claude/` created for settings alone does
 * not block the OpenCode or Cursor tiers.
 */
export const RULES_ROOTS = ['.agents/rules', '.claude/rules', '.opencode/rule', '.cursor/rules']
/** Maximum UTF-8 bytes read from one rules file; larger files are omitted. */
const MAX_FILE_BYTES = 1048576

export type Warn = (message: string) => void

/** One parsed rules file; `globs` is `undefined` for ungated rules. */
export interface ParsedRule {
  readonly displayPath: string
  readonly relPath: string
  readonly body: string
  readonly globs?: readonly RegExp[]
}

export interface ProjectRules {
  readonly root: string
  readonly rules: readonly ParsedRule[]
}

function isAbsentError(error: unknown): boolean {
  const code = error instanceof Error && 'code' in error ? (error as NodeJS.ErrnoException).code : undefined
  return code === 'ENOENT' || code === 'ENOTDIR'
}

function isAbortError(error: unknown, signal: AbortSignal | undefined): boolean {
  return signal?.aborted === true || (error instanceof Error && error.name === 'AbortError')
}

async function pathExists(path: string): Promise<boolean> {
  try {
    await stat(path)
    return true
  } catch (error) {
    if (isAbsentError(error)) return false
    throw error
  }
}

/** Walk upward from `cwd` to the closest directory containing `.git`. */
async function findProjectRoot(cwd: string): Promise<string> {
  let current = resolve(cwd)
  for (;;) {
    if (await pathExists(join(current, '.git'))) return current
    const parent = dirname(current)
    if (parent === current) return resolve(cwd)
    current = parent
  }
}

/** Rule file extensions: markdown everywhere, plus Cursor's `.mdc`. */
function isRuleFileName(fileName: string): boolean {
  return fileName.endsWith('.md') || fileName.endsWith('.mdc')
}

/**
 * Collect rule files under one rules root, following file symlinks but
 * skipping directory symlinks (loop safety) and hidden or vendored
 * directories (`node_modules`).
 */
async function collectRuleFiles(dir: string, out: string[]): Promise<void> {
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

/** One parsed rules file; `undefined` when the file carries no content. */
function parseRuleFile(root: string, path: string, raw: string, warn: Warn): ParsedRule | undefined {
  const { yaml, body } = splitFrontmatter(raw)
  const content = body.trim()
  if (content.length === 0) return undefined
  let globs: readonly RegExp[] | undefined
  if (yaml !== undefined) {
    if (parseBooleanTrue(yaml, 'alwaysApply')) {
      globs = undefined
    } else {
      const parsed = parsePathsField(yaml)
      if (parsed.present) {
        try {
          globs = parsed.globs?.map(pattern => compileGlob(pattern))
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

/** Read and parse rule files in sorted order; an abort returns the partial list. */
async function readRuleFiles(
  files: string[],
  root: string,
  signal: AbortSignal | undefined,
  warn: Warn,
): Promise<ParsedRule[]> {
  files.sort()
  const rules: ParsedRule[] = []
  for (const path of files) {
    let raw: string
    try {
      raw = await readFile(path, { encoding: 'utf8', signal })
    } catch (error) {
      if (isAbortError(error, signal)) return rules
      warn(`yushe-user-rules: failed to read ${path}: ${String(error)}`)
      continue
    }
    if (Buffer.byteLength(raw, 'utf8') > MAX_FILE_BYTES) continue
    const rule = parseRuleFile(root, path, raw, warn)
    if (rule !== undefined) rules.push(rule)
  }
  return rules
}

/** Discover and parse every rule file for one project. */
export async function scanRules(cwd: string, signal: AbortSignal | undefined, warn: Warn): Promise<ProjectRules> {
  let root: string
  try {
    root = await findProjectRoot(cwd)
  } catch (error) {
    warn(`yushe-user-rules: failed to locate project root: ${String(error)}`)
    return { root: resolve(cwd), rules: [] }
  }
  const files: string[] = []
  for (const dir of RULES_ROOTS) {
    const collected: string[] = []
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
  const rules = await readRuleFiles(files, root, signal, warn)
  return { root, rules }
}

/**
 * Discover and parse rule files under one explicit directory (no
 * project-root walk), such as the kit package's own `.agents/rules`.
 */
export async function scanRulesDir(dir: string, signal: AbortSignal | undefined, warn: Warn): Promise<readonly ParsedRule[]> {
  const files: string[] = []
  try {
    await collectRuleFiles(dir, files)
  } catch (error) {
    warn(`yushe-user-rules: failed to scan ${dir}: ${String(error)}`)
    return []
  }
  return readRuleFiles(files, dir, signal, warn)
}
