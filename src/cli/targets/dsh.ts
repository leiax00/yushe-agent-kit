/**
 * DSH installer（项目级）：skills 与 rules 全量复制到项目 `.agents/`
 * （DSH 直接读取项目 `.agents/skills/`；rules 由 yushe-user-rules 插件
 * 从项目 `.agents/rules/` 注入）；插件 → `dsh plugin add link:` 装入 profile。
 */
import { join } from 'node:path'
import { homedir } from 'node:os'
import { existsSync } from 'node:fs'
import { spawnSync } from 'node:child_process'
import { listSkills, listDshPlugins } from '../kit.js'
import { linkState } from '../fsx.js'
import { projectRoot, stageKit } from './stage.js'
import type { Installer, InstallOptions } from './types.js'

function legacyUserSkillsRoot(): string {
  return join(process.env.DSH_HOME ?? join(homedir(), '.dsh'), 'skills')
}

export const install: Installer['install'] = async (opts: InstallOptions) => {
  const lines = stageKit(projectRoot(opts))

  const legacy = legacyUserSkillsRoot()
  const legacyHits = listSkills().filter(s => linkState(join(legacy, s)) !== 'absent')
  if (legacyHits.length > 0) {
    lines.push(`WARN 用户级 skills 根存在旧安装（与项目级双源，建议删除）：${legacyHits.join(', ')}`)
  }

  if (opts.plugin !== false) {
    for (const plugin of listDshPlugins()) {
      lines.push(...installPlugin(join('.agents', 'dsh', 'plugins', plugin), opts))
    }
  }
  return lines
}

function installPlugin(pluginDir: string, opts: InstallOptions): string[] {
  const profile = opts.profile ? ['--profile', opts.profile] : []
  const link = `link:${join(projectRoot(opts), pluginDir)}`
  const res = spawnSync('dsh', ['plugin', ...profile, 'add', link], { encoding: 'utf8' })
  if (res.error) {
    return [`plugin: 无法调用 dsh（${res.error.message}），请手动执行：dsh plugin ${profile.join(' ')} add ${link}`]
  }
  return [`plugin: dsh plugin ${profile.join(' ')} add ${link}${res.status === 0 ? '' : `（失败，exit ${res.status}）`}`]
}

export const doctor: Installer['doctor'] = () => {
  const lines: string[] = []
  const root = process.cwd()
  for (const skill of listSkills()) {
    if (linkState(join(root, '.agents', 'skills', skill)) === 'absent') {
      lines.push(`FAIL .agents/skills/${skill} 未落位（尚未安装？）`)
    }
  }
  // Project .dsh/skills shadows .agents/skills in DSH discovery order.
  const projDsh = join(root, '.dsh', 'skills')
  if (existsSync(projDsh)) {
    const shadowing = listSkills().filter(s => existsSync(join(projDsh, s)))
    if (shadowing.length > 0) {
      lines.push(`FAIL 项目 .dsh/skills/ 遮蔽同名 skill（DSH 发现顺序 .dsh 优先）：${shadowing.join(', ')}`)
    }
  }
  const legacy = legacyUserSkillsRoot()
  const legacyHits = listSkills().filter(s => linkState(join(legacy, s)) !== 'absent')
  if (legacyHits.length > 0) {
    lines.push(`WARN 用户级 skills 根存在旧安装（可能与项目级双源）：${legacyHits.join(', ')}`)
  }
  return lines
}
