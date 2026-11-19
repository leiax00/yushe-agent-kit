/**
 * Claude Code installer（项目级）：kit 全量复制到项目 `.agents/`，再在
 * `.claude/skills/<name>`、`.claude/rules/<rule>` 建相对软链指向 `.agents/`
 * 对应内容（相对链接使项目目录整体可移动）。
 */
import { join, relative } from 'node:path'
import { homedir } from 'node:os'
import { listRules, listSkills } from '../kit.js'
import { place, linkState } from '../fsx.js'
import { projectRoot, stageKit } from './stage.js'
import type { Installer, InstallOptions } from './types.js'

export const install: Installer['install'] = async (opts: InstallOptions) => {
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
  const root = process.cwd()
  for (const skill of listSkills()) {
    const target = join(root, '.claude', 'skills', skill)
    const state = linkState(target)
    if (state === 'absent') lines.push(`WARN .claude/skills/${skill} 未链接（尚未安装？）`)
    else if (state === 'symlink-broken') lines.push(`FAIL .claude/skills/${skill} 软链失效`)
    else if (state === 'dir') lines.push(`WARN .claude/skills/${skill} 是实体目录，可能是过时副本`)
    if (linkState(join(root, '.agents', 'skills', skill)) === 'absent') {
      lines.push(`FAIL .agents/skills/${skill} 未落位`)
    }
  }
  const legacy = join(homedir(), '.claude', 'skills')
  const legacyHits = listSkills().filter(s => linkState(join(legacy, s)) !== 'absent')
  if (legacyHits.length > 0) {
    lines.push(`WARN 用户级 ~/.claude/skills 存在旧安装（与项目级双源，建议删除）：${legacyHits.join(', ')}`)
  }
  return lines
}
