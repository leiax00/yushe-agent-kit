/**
 * Claude Code installer: skills → ~/.claude/skills/<name>（软链）;
 * rules → 项目 .claude/rules/（Claude Code 原生 rules 目录约定，
 * 与 yushe-user-rules 扫描的 tier 2 一致）。
 */
import { join } from 'node:path'
import { homedir } from 'node:os'
import { listRules, listSkills, paths } from '../kit.js'
import { place, refreshCopy, linkState } from '../fsx.js'
import type { Installer, InstallOptions } from './types.js'

function claudeSkillsRoot(): string {
  return join(homedir(), '.claude', 'skills')
}

function projectRulesRoot(project?: string): string {
  return join(project ?? process.cwd(), '.claude', 'rules')
}

export const install: Installer['install'] = async (opts: InstallOptions) => {
  const lines: string[] = []
  const root = claudeSkillsRoot()

  for (const skill of listSkills()) {
    const action = place(join(paths.skills, skill), join(root, skill), { copy: opts.copy })
    lines.push(`${action.padEnd(7)} ${root}/${skill}`)
  }

  const rulesRoot = projectRulesRoot(opts.project)
  for (const rule of listRules()) {
    const target = join(rulesRoot, rule)
    const action = opts.copy
      ? refreshCopy(join(paths.rules, rule), target)
      : place(join(paths.rules, rule), target, { copy: true })
    lines.push(`${action.padEnd(7)} ${target}`)
  }
  return lines
}

export const update: Installer['update'] = async (opts: InstallOptions) => {
  return install({ ...opts, copy: true })
}

export const doctor: Installer['doctor'] = () => {
  const lines: string[] = []
  const root = claudeSkillsRoot()
  for (const skill of listSkills()) {
    const state = linkState(join(root, skill))
    if (state === 'symlink-broken') lines.push(`FAIL ${root}/${skill} 软链失效`)
    if (state === 'dir') lines.push(`WARN ${root}/${skill} 是实体目录，可能是过时副本（update 可刷新）`)
  }
  return lines
}
