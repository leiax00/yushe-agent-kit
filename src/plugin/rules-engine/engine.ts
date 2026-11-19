/**
 * Stateful rules injection. `loadRules(cwd, signal, warn)` resolves the
 * rules visible from a session cwd; each rule injects at most once per
 * session, and `paths`-gated rules wait for a matching file touch.
 *
 * Mounts on the public `agent/pre-step` waterfall and the `tools/result`
 * event. The agent loop logs injected messages as `user/message`, so no
 * extra persistence work is needed here.
 */
import { randomUUID } from 'node:crypto'
import { isAbsolute, relative, resolve, sep } from 'node:path'
import { renderBatch } from './render.js'
import { scanRules, type ParsedRule, type ProjectRules, type Warn } from './scan.js'

export const SOURCE_KIND = 'yushe-user-rules'
export const LEGACY_SOURCE_KIND = 'plugin:yushe-user-rules'

/** Tool executions whose `file_path` argument counts as a path touch. */
const TOUCH_TOOLS = new Set(['read', 'write', 'edit'])

export interface InjectorOptions {
  sourceKind?: string
  legacySourceKind?: string
  loadRules?: (cwd: string, signal: AbortSignal | undefined, warn: Warn) => Promise<ProjectRules>
}

/** Rule paths already carried by this session's visible history. */
async function suppliedFromHistory(session: any, warn: Warn, kind: string, legacyKind: string | undefined): Promise<Set<string>> {
  try {
    const derived = session.deriveMessages()
    const list = derived instanceof Promise ? await derived : derived
    const supplied = new Set<string>()
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

function filePathFromExecution(exec: any): string | undefined {
  if (!TOUCH_TOOLS.has(exec.name)) return undefined
  if (typeof exec.arguments !== 'object' || exec.arguments === null) return undefined
  if (typeof exec.arguments.file_path !== 'string') return undefined
  const filePath = exec.arguments.file_path.trim()
  return filePath.length > 0 ? filePath : undefined
}

interface SessionState {
  cwd: string
  root?: string
  rules?: readonly ParsedRule[]
  historyScanned: boolean
  supplied: Set<string>
  pending: Set<string>
}

/**
 * Register rules injection on `ctx`. `loadRules` resolves the rules visible
 * from a session cwd; each rule injects at most once per session, and
 * `paths`-gated rules wait for a matching file touch.
 */
export function makeRuleInjector(ctx: any, { sourceKind = SOURCE_KIND, legacySourceKind, loadRules = scanRules }: InjectorOptions = {}): void {
  const warn: Warn = message => ctx.logger?.warn(message)
  const sessions = new WeakMap<object, SessionState>()

  const stateOf = (session: any): SessionState => {
    let state = sessions.get(session)
    if (state === undefined) {
      state = {
        cwd: session.header?.cwd ?? process.cwd(),
        historyScanned: false,
        supplied: new Set(),
        pending: new Set(),
      }
      sessions.set(session, state)
    }
    return state
  }

  const ensureRules = async (state: SessionState, signal: AbortSignal | undefined) => {
    if (state.rules === undefined) {
      const { root, rules } = await loadRules(state.cwd, signal, warn)
      state.root = root
      state.rules = rules
    }
    return state.rules
  }

  ctx.on('tools/result', (exec: any, result: any) => {
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
    const relPath = relative(state.root!, resolve(state.cwd, filePath))
    if (relPath.length === 0 || relPath === '..' || relPath.startsWith(`..${sep}`) || isAbsolute(relPath)) return
    const posix = relPath.split(sep).join('/')
    for (const rule of rules) {
      if (rule.globs === undefined || state.supplied.has(rule.displayPath) || state.pending.has(rule.displayPath)) continue
      if (rule.globs.some(matcher => matcher.test(posix))) state.pending.add(rule.displayPath)
    }
  })

  ctx.on('agent/pre-step', async ({ agent, messages, signal }: any, next: () => Promise<any>) => {
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
    const last = decision.messages.findLastIndex((message: unknown) => messages.includes(message))
    const at = last >= 0 ? last + 1 : decision.messages.length
    return { ...decision, messages: decision.messages.toSpliced(at, 0, desired) }
  })
}
