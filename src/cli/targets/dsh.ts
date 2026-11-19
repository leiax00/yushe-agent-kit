/**
 * DSH installer: skills → user skills root as symlinks; rules → project
 * `.agents/rules/`, injected by the yushe-user-rules plugin; plugin →
 * `dsh plugin add link:` into the active profile.
 */
import { join } from 'node:path'
import { homedir } from 'node:os'
import { existsSync } from 'node:fs'
import { spawnSync } from 'node:child_process'
import { listSkills, listRules, listDshPlugins, paths } from '../kit.js'
import { place, linkState } from '../fsx.js'
import type { Installer, InstallOptions } from './types.js'

function dshHome(): string {
  return process.env.DSH_HOME ?? join(homedir(), '.dsh')
}

function skillsRoot(): string {
  return join(dshHome(), 'skills')
}

export const install: Installer['install'] = async (opts: InstallOptions) => {
  const lines: string[] = []
  const root = skillsRoot()

  for (const skill of listSkills()) {
    const action = place(join(paths.skills, skill), join(root, skill), { copy: opts.copy })
    lines.push(`${action.padEnd(7)} ${root}/${skill}`)
  }
  lines.push(`rules: 项目 .agents/rules/ 由 yushe-user-rules 插件注入（kit 自带 ${listRules().length} 条规则，随项目放置即可）`)

  if (opts.plugin !== false) {
    for (const plugin of listDshPlugins()) {
      lines.push(...installPlugin(join(paths.dshPlugins, plugin), opts))
    }
  }
  return lines
}

function installPlugin(pluginDir: string, opts: InstallOptions): string[] {
  const profile = opts.profile ? ['--profile', opts.profile] : []
  const link = `link:${pluginDir}`
  const res = spawnSync('dsh', ['plugin', ...profile, 'add', link], { encoding: 'utf8' })
  if (res.error) {
    return [`plugin: 无法调用 dsh（${res.error.message}），请手动执行：dsh plugin ${profile.join(' ')} add ${link}`]
  }
  return [`plugin: dsh plugin ${profile.join(' ')} add ${link}${res.status === 0 ? '' : `（失败，exit ${res.status}）`}`]
}

export const doctor: Installer['doctor'] = () => {
  const lines: string[] = []
  const root = skillsRoot()

  for (const skill of listSkills()) {
    const userState = linkState(join(root, skill))
    if (userState === 'symlink-broken') lines.push(`FAIL ${root}/${skill} 软链失效`)
    if (userState === 'dir') lines.push(`WARN ${root}/${skill} 是实体目录（非 kit 软链），可能双源或过时副本`)
  }
  // Project .dsh/skills shadows .agents/skills in DSH discovery order.
  const projDsh = join(process.cwd(), '.dsh', 'skills')
  if (existsSync(projDsh)) {
    const shadowing = listSkills().filter(s => existsSync(join(projDsh, s)))
    if (shadowing.length > 0) {
      lines.push(`FAIL 项目 .dsh/skills/ 遮蔽同名 skill（DSH 发现顺序 .dsh 优先）：${shadowing.join(', ')}`)
    }
  }
  return lines
}
