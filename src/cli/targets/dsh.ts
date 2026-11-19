/**
 * DSH installer。单一分发通道：kit 整体插件（skills + rules 两个独立
 * 开关的组件行）。`install dsh` 确保插件已装（`dsh plugin add link:`）；
 * `install dsh <path>` 额外把 kit 落位到项目 `.agents/`（项目内容以
 * 更高优先级覆盖插件：skills rank 200 > 600，rules 同名文件项目侧胜出）。
 */
import { join } from 'node:path'
import { homedir } from 'node:os'
import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { spawnSync } from 'node:child_process'
import { listSkills, kitRoot, pkgName } from '../kit.js'
import { linkState } from '../fsx.js'
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

/** Ensure the whole-kit plugin is added to the target profile. */
function ensureKitPlugin(opts: InstallOptions, present: string[]): string[] {
  const target = opts.profile
  if (target !== undefined && present.includes(target)) {
    return [`plugin: kit 整体插件已装于 profile ${target}，跳过`]
  }
  const profile = target !== undefined ? ['--profile', target] : []
  const link = `link:${kitRoot}`
  const res = spawnSync('dsh', ['plugin', ...profile, 'add', link], { encoding: 'utf8' })
  if (res.error) {
    return [`plugin: 无法调用 dsh（${res.error.message}），请手动执行：dsh plugin ${profile.join(' ')} add ${link}`]
  }
  return [`plugin: dsh plugin ${profile.join(' ')} add ${link}${res.status === 0 ? '' : `（失败，exit ${res.status}）`}`]
}

export const install: Installer['install'] = async (opts: InstallOptions) => {
  const lines: string[] = []

  if (opts.project !== undefined) {
    lines.push(...stageKit(projectRoot(opts)))
  }

  if (opts.plugin === false) {
    if (opts.project === undefined) {
      lines.push('skills/rules: 已按 --no-plugin 跳过（DSH 侧内容均由 kit 整体插件提供）')
    }
    return lines
  }

  const present = kitPluginProfiles()
  const already = opts.profile !== undefined ? present.includes(opts.profile) : present.length > 0
  if (already) {
    lines.push(`plugin: kit 整体插件已装于 profile ${present.join(', ')}，跳过（skills/rules 两组件行可在 Plugin Manager 独立开关）`)
  } else {
    lines.push(...ensureKitPlugin(opts, present))
  }
  return lines
}

export const doctor: Installer['doctor'] = () => {
  const lines: string[] = []
  const cwd = process.cwd()

  // User-level skills root and the whole-kit plugin both serve kit skills.
  const pluginProfiles = kitPluginProfiles()
  if (pluginProfiles.length > 0) {
    const userRoot = userSkillsRoot()
    const linked = listSkills().filter(s => linkState(join(userRoot, s)) !== 'absent')
    if (linked.length > 0) {
      lines.push(`WARN 整体插件（profile ${pluginProfiles.join(', ')}）与用户级 skills 软链双源：${linked.join(', ')}——建议删除用户级软链（插件已覆盖）`)
    }
  }

  // Project .dsh/skills shadows .agents/skills in DSH discovery order.
  const projDsh = join(cwd, '.dsh', 'skills')
  if (existsSync(projDsh)) {
    const shadowing = listSkills().filter(s => existsSync(join(projDsh, s)))
    if (shadowing.length > 0) {
      lines.push(`FAIL 项目 .dsh/skills/ 遮蔽同名 skill（DSH 发现顺序 .dsh 优先）：${shadowing.join(', ')}`)
    }
  }
  return lines
}
