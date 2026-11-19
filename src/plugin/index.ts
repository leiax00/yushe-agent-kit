/**
 * yushe-agent-kit whole-package DSH plugin.
 *
 * One `dsh plugin add @leiax00/yushe-agent-kit` installs the whole kit:
 * - skills: a SkillProvider serving every skill from the package's
 *   `.agents/skills/` at the bundled-like rank, so project- and user-level
 *   same-name skills override the kit copy;
 * - rules: project rules (`.agents` > `.claude` > `.opencode` > `.cursor`,
 *   first present wins) plus the package's own `.agents/rules/` defaults,
 *   skipped per file when the project already carries the same rule path.
 *
 * Zero runtime dependencies on purpose: the package may be installed via
 * `dsh plugin add link:` whose own dependencies are not installed. Rule
 * injection reuses the yushe-user-rules engine shipped in this package; do
 * not enable both plugins in one profile, or project rules are injected
 * twice.
 */
import { readdir, readFile } from 'node:fs/promises'
import { basename, dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

/** Cordis plugin identity. */
export const name = 'yushe-agent-kit'
/** Registry used by the bundled skills provider. */
export const inject = ['skills']

/** dist/plugin/ → package root (both dev checkout and published layout). */
const PKG_ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..')
const SKILLS_ROOT = join(PKG_ROOT, '.agents', 'skills')
const RULES_ROOT = join(PKG_ROOT, '.agents', 'rules')
const RULES_HELPER = join(PKG_ROOT, '.agents', 'dsh', 'plugins', 'yushe-user-rules', 'index.js')
const PROVIDER = 'yushe-agent-kit'
/** Bundled-like rank: project (200) and user (400) same-name skills win. */
const KIT_RANK = 600

interface SkillSummary {
  readonly name: string
  readonly description: string
  readonly invocation: { modelInvocable: boolean; userInvocable: boolean }
  readonly provider: string
  readonly source: string
  readonly resourceBase: { kind: string; path: string }
}

type SkillCandidate = SkillSummary & {
  readonly rank: number
  readonly locator: unknown
}

interface SkillControl {
  invalidate(): void
}

interface KitContext {
  readonly logger?: { warn(message: string): void }
  readonly skills: {
    registerProvider(
      make: (control: SkillControl) => {
        readonly name: string
        readonly list: (options: { signal?: AbortSignal }) =>
          Promise<readonly SkillCandidate[] | { candidates: readonly SkillCandidate[]; complete: boolean }>
        readonly get: (candidate: SkillCandidate, options: { signal?: AbortSignal }) =>
          Promise<SkillSummary & { readonly content: string } | undefined>
      },
    ): void
  }
  on(event: string, ...args: unknown[]): void
  [key: string]: unknown
}

interface ParsedSkillFile {
  readonly skillName: string
  readonly description: string
  readonly content: string
}

function parseSkillFile(raw: string, dirName: string): ParsedSkillFile {
  const match = /^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/u.exec(raw)
  if (match?.[1] === undefined) throw new Error(`${dirName}/SKILL.md has no YAML frontmatter`)
  const fm = match[1]
  const name = fm.match(/^name:\s*(.+)$/m)?.[1]?.trim() ?? dirName
  const description = fm.match(/^description:\s*(.+)$/m)?.[1]?.trim()
  if (description === undefined || description.length === 0) {
    throw new Error(`${dirName}/SKILL.md has no description`)
  }
  return { skillName: name, description, content: raw.slice(match[0].length).trim() }
}

async function listSkillDirs(): Promise<string[]> {
  try {
    const entries = await readdir(SKILLS_ROOT, { withFileTypes: true })
    return entries.filter(e => e.isDirectory()).map(e => e.name).sort()
  } catch {
    return []
  }
}

async function readSkill(dirName: string, signal?: AbortSignal): Promise<ParsedSkillFile | { error: unknown; persistent: boolean }> {
  let raw: string
  try {
    raw = await readFile(join(SKILLS_ROOT, dirName, 'SKILL.md'), { encoding: 'utf8', signal })
  } catch (error) {
    const code = error instanceof Error && 'code' in error ? (error as NodeJS.ErrnoException).code : undefined
    return { error, persistent: code === 'ENOENT' || code === 'ENOTDIR' }
  }
  try {
    return parseSkillFile(raw, dirName)
  } catch (error) {
    return { error, persistent: true }
  }
}

/** Lazy import of the plain-JS rules engine shipped in `.agents/dsh/`. */
async function rulesHelper(): Promise<any> {
  return import(RULES_HELPER)
}

export function apply(ctx: KitContext): void {
  const warn = (message: string) => ctx.logger?.warn(message)
  const reported = new Set<string>()

  ctx.skills.registerProvider(control => ({
    name: PROVIDER,
    async list(options) {
      const dirNames = await listSkillDirs()
      const candidates: SkillCandidate[] = []
      let complete = true
      for (const dirName of dirNames) {
        const read = await readSkill(dirName, options.signal)
        if ('error' in read) {
          if (!read.persistent) complete = false
          const text = String(read.error)
          if (!reported.has(text)) {
            reported.add(text)
            warn(`yushe-agent-kit: skill "${dirName}" is unavailable: ${text}`)
          }
          continue
        }
        const directory = join(SKILLS_ROOT, dirName)
        candidates.push({
          name: read.skillName,
          description: read.description,
          invocation: { modelInvocable: true, userInvocable: true },
          provider: PROVIDER,
          source: 'bundled',
          rank: KIT_RANK,
          resourceBase: { kind: 'directory', path: directory.split('\\').join('/') },
          locator: join(directory, 'SKILL.md'),
        })
      }
      return { candidates, complete }
    },
    async get(candidate, options) {
      const { rank: _rank, ...summary } = candidate
      const skillDir = basename(dirname(String(candidate.locator)))
      const read = await readSkill(skillDir, options.signal)
      if ('error' in read) {
        if (!read.persistent) throw read.error
        control.invalidate()
        return undefined
      }
      return { ...summary, name: read.skillName, description: read.description, content: read.content }
    },
  }))

  void rulesHelper().then(helper => {
    helper.makeRuleInjector(ctx, {
      sourceKind: 'yushe-agent-kit-rules',
      loadRules: async (cwd: string, signal: AbortSignal | undefined, warnFn: (m: string) => void) => {
        const project = await helper.scanRules(cwd, signal, warnFn)
        const kitRules = await helper.scanRulesDir(RULES_ROOT, signal, warnFn)
        const projectPaths = new Set<string>(project.rules.map((rule: { relPath: string }) => rule.relPath))
        // Project rules win per file; unshadowed kit defaults join the same
        // single injection pass so the kit plugin alone covers both layers.
        return {
          root: project.root,
          rules: [...project.rules, ...kitRules.filter((rule: { relPath: string }) => !projectPaths.has(rule.relPath))],
        }
      },
    })
  }).catch(error => {
    warn(`yushe-agent-kit: rules engine unavailable: ${String(error)}`)
  })
}
