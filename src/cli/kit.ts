/**
 * Kit resource inventory: the `.agents/` payload is the single source of truth.
 * Everything the CLI installs is enumerated here — no hardcoded skill lists.
 */
import { readdirSync, readFileSync, existsSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

/** Repository / package root. In dev this file runs from src/, in prod from dist/. */
export const kitRoot = join(dirname(fileURLToPath(import.meta.url)), '..', '..')

export const paths = {
  skills: join(kitRoot, '.agents', 'skills'),
  rules: join(kitRoot, '.agents', 'rules'),
} as const

export function listSkills(): string[] {
  return subdirs(paths.skills)
}

export function listRules(): string[] {
  if (!existsSync(paths.rules)) return []
  return readdirSync(paths.rules).filter(f => f.endsWith('.md')).sort()
}

export function version(): string {
  return JSON.parse(readFileSync(join(kitRoot, 'package.json'), 'utf8')).version as string
}

/** Published package name of this kit, for plugin-presence detection. */
export function pkgName(): string {
  return JSON.parse(readFileSync(join(kitRoot, 'package.json'), 'utf8')).name as string
}

/** SKILL.md frontmatter name of a skill dir, for name/dir consistency checks. */
export function skillEntryName(skillDir: string): string | undefined {
  const file = join(paths.skills, skillDir, 'SKILL.md')
  if (!existsSync(file)) return undefined
  const text = readFileSync(file, 'utf8')
  const match = text.match(/^---\r?\n([\s\S]*?)\r?\n---/)
  if (!match) return undefined
  return match[1].match(/^name:\s*(.+)$/m)?.[1]?.trim()
}

function subdirs(dir: string): string[] {
  if (!existsSync(dir)) return []
  return readdirSync(dir, { withFileTypes: true })
    .filter(e => e.isDirectory())
    .map(e => e.name)
    .sort()
}
