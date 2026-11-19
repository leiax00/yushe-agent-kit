/**
 * Project-level staging: copy the full kit payload (skills + rules) into the
 * target project's `.agents/` — the single source of truth per project.
 */
import { join } from 'node:path'
import { listRules, listSkills, paths } from '../kit.js'
import { refreshCopy } from '../fsx.js'
import type { InstallOptions } from './types.js'

export function projectRoot(opts: InstallOptions): string {
  return opts.project ?? process.cwd()
}

/** Copy all kit skills + rules into <project>/.agents/. Returns report lines. */
export function stageKit(root: string): string[] {
  const lines: string[] = []
  const skillsRoot = join(root, '.agents', 'skills')
  for (const skill of listSkills()) {
    const action = refreshCopy(join(paths.skills, skill), join(skillsRoot, skill))
    lines.push(`${(action === 'symlink' ? 'link' : 'stage').padEnd(7)} ${join('.agents', 'skills', skill)}`)
  }
  const rulesRoot = join(root, '.agents', 'rules')
  for (const rule of listRules()) {
    refreshCopy(join(paths.rules, rule), join(rulesRoot, rule))
    lines.push(`stage   ${join('.agents', 'rules', rule)}`)
  }
  return lines
}
