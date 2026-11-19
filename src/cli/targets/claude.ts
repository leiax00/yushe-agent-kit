/**
 * Claude Code installer。两种模式：
 * - 用户级（默认）：skills 软链到 ~/.claude/skills/；rules 复制到
 *   当前目录 .claude/rules/（Claude Code 原生 rules 目录约定）。
 * - 项目级（install claude <path>）：kit 全量复制到该项目 .agents/，
 *   再在 .claude/skills/<name>、.claude/rules/<rule> 建相对软链。
 */
import { join, relative } from 'node:path'
import { homedir } from 'node:os'
import { existsSync } from 'node:fs'
import { listRules, listSkills, paths } from '../kit.js'
import { place, refreshCopy, linkState } from '../fsx.js'
import { projectRoot, stageKit } from './stage.js'
import type { Installer, InstallOptions } from './types.js'

function userSkillsRoot(): string {
  return join(homedir(), '.claude', 'skills')
}

export const install: Installer['install'] = async (opts: InstallOptions) => {
  if (opts.project === undefined) return installUser(opts)
  return installProject(opts)
}

/** 用户级：skills 软链到 ~/.claude/skills；rules 复制到 cwd 的 .claude/rules。 */
async function installUser(opts: InstallOptions): Promise<string[]> {
  const lines: string[] = []
  const root = userSkillsRoot()
  for (const skill of listSkills()) {
    const action = place(join(paths.skills, skill), join(root, skill), { copy: opts.copy })
    lines.push(`${action.padEnd(7)} ${join('~', '.claude', 'skills', skill)}`)
  }
  const rulesRoot = join(process.cwd(), '.claude', 'rules')
  for (const rule of listRules()) {
    const target = join(rulesRoot, rule)
    const action = opts.copy
      ? refreshCopy(join(paths.rules, rule), target)
      : place(join(paths.rules, rule), target, { copy: true })
    lines.push(`${action.padEnd(7)} ${relative(process.cwd(), target)}`)
  }
  return lines
}

/** 项目级：kit 落位 .agents/ 后，工具目录建相对软链。 */
async function installProject(opts: InstallOptions): Promise<string[]> {
  const root = projectRoot(opts)
  const lines = stageKit(root)

  for (const skill of listSkills()) {
    const target = join(root, '.claude', 'skills', skill)
    const action = place(join(root, '.agents', 'skills', skill), target, {
      relative: true,
      copy: opts.copy,
    })
    lines.push(`${action.padEnd(7)} ${relative(root, target)}`)
  }

  for (const rule of listRules()) {
    const target = join(root, '.claude', 'rules', rule)
    const action = place(join(root, '.agents', 'rules', rule), target, {
      relative: true,
      copy: opts.copy,
    })
    lines.push(`${action.padEnd(7)} ${relative(root, target)}`)
  }
  return lines
}

export const update: Installer['update'] = async (opts: InstallOptions) => {
  return install(opts)
}

export const doctor: Installer['doctor'] = () => {
  const lines: string[] = []
  const cwd = process.cwd()

  // 用户级安装现场
  const userRoot = userSkillsRoot()
  for (const skill of listSkills()) {
    const state = linkState(join(userRoot, skill))
    if (state === 'symlink-broken') lines.push(`FAIL ~/.claude/skills/${skill} 软链失效`)
    else if (state === 'dir') lines.push(`WARN ~/.claude/skills/${skill} 是实体目录，可能是过时副本`)
  }

  // 项目级安装现场（cwd 下有 kit 落位且使用了 .claude 时才检查）
  const claudeRoot = join(cwd, '.claude')
  if (existsSync(claudeRoot)) {
    const staged = listSkills().filter(s => linkState(join(cwd, '.agents', 'skills', s)) !== 'absent')
    for (const skill of staged) {
      const target = join(claudeRoot, 'skills', skill)
      const state = linkState(target)
      if (state === 'absent') lines.push(`WARN .claude/skills/${skill} 未链接（项目级安装未完成？）`)
      else if (state === 'symlink-broken') lines.push(`FAIL .claude/skills/${skill} 软链失效`)
      else if (state === 'dir') lines.push(`WARN .claude/skills/${skill} 是实体目录，可能是过时副本`)
    }
  }
  return lines
}
