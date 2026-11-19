/**
 * Skills component: a SkillProvider serving every skill from the package's
 * `.agents/skills/` at the bundled-like rank, so project- and user-level
 * same-name skills override the kit copy.
 */
import { readdir, readFile } from 'node:fs/promises'
import { basename, dirname, join } from 'node:path'
import { SKILLS_ROOT } from './paths.js'
import type { SkillCandidate, KitContext } from './types.js'

const PROVIDER = 'yushe-agent-kit'
/** Bundled-like rank: project (200) and user (400) same-name skills win. */
const KIT_RANK = 600

interface ParsedSkillFile {
  readonly skillName: string
  readonly description: string
  readonly content: string
}

type SkillRead = ParsedSkillFile | { readonly error: unknown; readonly persistent: boolean }

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

function isAbsentError(error: unknown): boolean {
  const code = error instanceof Error && 'code' in error ? (error as NodeJS.ErrnoException).code : undefined
  return code === 'ENOENT' || code === 'ENOTDIR'
}

async function listSkillDirs(): Promise<string[]> {
  try {
    const entries = await readdir(SKILLS_ROOT, { withFileTypes: true })
    return entries.filter(e => e.isDirectory()).map(e => e.name).sort()
  } catch {
    return []
  }
}

async function readSkill(dirName: string, signal?: AbortSignal): Promise<SkillRead> {
  let raw: string
  try {
    raw = await readFile(join(SKILLS_ROOT, dirName, 'SKILL.md'), { encoding: 'utf8', signal })
  } catch (error) {
    return { error, persistent: isAbsentError(error) }
  }
  try {
    return parseSkillFile(raw, dirName)
  } catch (error) {
    return { error, persistent: true }
  }
}

/** Register the kit skills provider on `ctx`. */
export function registerSkillsProvider(ctx: KitContext): void {
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
}
