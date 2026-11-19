/**
 * DSH installer。两种模式：
 * - 用户级（默认）：skills 软链到用户 skills 根（DSH_HOME/skills）；
 *   rules 由 yushe-user-rules 插件读取项目 .agents/rules/。
 * - 项目级（install dsh <path>）：kit 全量复制到该项目 .agents/
 *   （DSH 直接读取 .agents/skills/，插件注入 .agents/rules/）。
 * 插件 → `dsh plugin add link:` 装入 profile（两种模式都装）。
 */
import { join } from 'node:path'
import { homedir } from 'node:os'
import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { spawnSync } from 'node:child_process'
import { listSkills, listDshPlugins, paths, pkgName } from '../kit.js'
import { place, linkState } from '../fsx.js'
import { projectRoot, stageKit } from './stage.js'
import type { Installer, InstallOptions } from './types.js'

function dshHome(): string {
  return process.env.DSH_HOME ?? join(homedir(), '.dsh')
}

function userSkillsRoot(): string {
  return join(dshHome(), 'skills')
}

/** Profiles whose dependencies already include the whole-kit plugin package. */
function kitPluginProfiles(): string[] {
  const profilesRoot = join(dshHome(), 'profiles')
  if (!existsSync(profilesRoot)) return []
  const hits: string[] = []
  for (const entry of readdirSync(profilesRoot, { withFileTypes: true })) {
    if (!entry.isDirectory() || entry.name.startsWith('.')) continue
    const manifest = join(profilesRoot, entry.name, 'package.json')
    if (!existsSync(manifest)) continue
    try {
      const deps = JSON.parse(readFileSync(manifest, 'utf8'))?.dependencies
      if (deps !== null && typeof deps === 'object' && pkgName() in deps) hits.push(entry.name)
    } catch {
      // An unreadable profile manifest is not an install blocker.
    }
  }
  return hits
}

export const install: Installer['install'] = async (opts: InstallOptions) => {
  const lines: string[] = []

  const pluginProfiles = kitPluginProfiles()
  if (opts.project === undefined && pluginProfiles.length > 0) {
    // Whole-kit plugin already serves skills (rank 600) and rules; linking
    // user-level skills here would create the dual source ourselves.
    lines.push(`plugin: 整体插件已装于 profile ${pluginProfiles.join(', ')}，skills + rules 已由插件提供，跳过用户级安装（二选一）`)
    return lines
  }

  if (opts.project === undefined) {
    const root = userSkillsRoot()
    for (const skill of listSkills()) {
      const action = place(join(paths.skills, skill), join(root, skill), { copy: opts.copy })
      lines.push(`${action.padEnd(7)} ${join('<DSH_HOME>', 'skills', skill)}`)
    }
  } else {
    lines.push(...stageKit(projectRoot(opts)))
  }
  lines.push('rules: 项目 .agents/rules/ 由 yushe-user-rules 插件注入（项目级安装已随 kit 落位）')

  if (opts.plugin !== false && pluginProfiles.length === 0) {
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
  const cwd = process.cwd()

  // 用户级安装现场
  const userRoot = userSkillsRoot()
  // Whole-kit plugin and user-level links both serve kit skills: dual source.
  const pluginProfiles = kitPluginProfiles()
  if (pluginProfiles.length > 0) {
    const linked = listSkills().filter(s => linkState(join(userRoot, s)) !== 'absent')
    if (linked.length > 0) {
      lines.push(`WARN 整体插件（profile ${pluginProfiles.join(', ')}）与用户级 skills 软链双源：${linked.join(', ')}——插件 rank 600 会被用户级覆盖，建议删除用户级软链`)
    }
  }
  for (const skill of listSkills()) {
    const state = linkState(join(userRoot, skill))
    if (state === 'symlink-broken') lines.push(`FAIL 用户 skills 根/${skill} 软链失效`)
    else if (state === 'dir') lines.push(`WARN 用户 skills 根/${skill} 是实体目录（非 kit 软链），可能双源或过时副本`)
  }

  // 项目 .dsh/skills shadows .agents/skills in DSH discovery order.
  const projDsh = join(cwd, '.dsh', 'skills')
  if (existsSync(projDsh)) {
    const shadowing = listSkills().filter(s => existsSync(join(projDsh, s)))
    if (shadowing.length > 0) {
      lines.push(`FAIL 项目 .dsh/skills/ 遮蔽同名 skill（DSH 发现顺序 .dsh 优先）：${shadowing.join(', ')}`)
    }
  }
  return lines
}
