/**
 * Commands (commander-based) and shared kit-level doctor findings.
 */
import { Command, InvalidArgumentError } from 'commander'
import { join } from 'node:path'
import { existsSync } from 'node:fs'
import { listSkills, listRules, listDshPlugins, skillEntryName, version, paths } from './kit.js'
import { targetNames, targets, getTarget, loadInstaller } from './targets/registry.js'
import type { InstallOptions } from './targets/types.js'

const program = new Command()

program
  .name('yak')
  .description('yushe-agent-kit — 把 kit 资源安装到各 vibe coding 工具')
  .version(version())

function parseTargets(value: string, previous: string[]): string[] {
  return [...previous, value]
}

/** 位置参数是否是项目路径（. / .. / ~ / 绝对或相对路径），而非目标工具名。 */
function isPathArg(value: string): boolean {
  return value === '.' || value === '..' || value === '~'
    || value.startsWith('./') || value.startsWith('../')
    || value.startsWith('/') || value.startsWith('~/')
}

/** 把位置参数拆成目标工具与项目路径；--project 优先于位置路径。 */
function splitArgs(
  args: string[],
  opts: { project?: string },
): { names: string[]; project?: string } {
  const pathArgs = args.filter(isPathArg)
  const names = args.filter(a => !isPathArg(a))
  if (pathArgs.length > 1) throw new InvalidArgumentError('最多给一个项目路径')
  return { names, project: opts.project ?? pathArgs[0] }
}

program.command('install')
  .description('安装 kit 到目标工具（默认用户级；末尾跟 . 或绝对/相对路径 = 项目级安装到该目录）')
  .argument('<target...>', '目标工具（dsh/claude/…，可多个）或 --all；项目级安装再跟一个路径', parseTargets, [])
  .option('--all', '安装全部已核实目标')
  .option('--copy', '强制复制而非软链')
  .option('--project <dir>', '项目级安装目标目录（与位置路径参数等价，优先级更高）')
  .option('--profile <name>', 'DSH 插件安装目标 profile')
  .option('--no-plugin', '跳过 DSH 插件安装')
  .action(async (targetList: string[], opts: InstallOptions & { all?: boolean }) => {
    const { names, project } = splitArgs(targetList, opts)
    const finalNames = opts.all ? targetNames() : names
    if (finalNames.length === 0) throw new InvalidArgumentError(`缺少目标工具（可用：${targetNames().join(', ')}，或 --all）`)
    let failed = false
    for (const name of finalNames) {
      const t = getTarget(name) // unknown target throws with the list
      const mod = await loadInstaller(name)
      console.log(`\n== ${t.label} ==`)
      try {
        const lines = await mod.install({ ...opts, project })
        for (const line of lines) console.log(`  ${line}`)
      } catch (error) {
        failed = true
        console.error(`  安装失败：${error instanceof Error ? error.message : String(error)}`)
      }
    }
    if (failed) process.exitCode = 1
  })

program.command('update')
  .description('刷新复制型安装（软链安装实时生效，无需 update）')
  .argument('<target...>', '目标工具，可多个；项目级更新再跟一个路径', parseTargets, [])
  .option('--project <dir>', '项目级更新目标目录（与位置路径参数等价，优先级更高）')
  .action(async (targetList: string[], opts: InstallOptions) => {
    const { names, project } = splitArgs(targetList, opts)
    if (names.length === 0) throw new InvalidArgumentError('缺少目标工具')
    let failed = false
    for (const name of names) {
      const t = getTarget(name)
      const mod = await loadInstaller(name)
      console.log(`\n== ${t.label} ==`)
      try {
        const fn = mod.update ?? mod.install
        const lines = await fn({ ...opts, project })
        for (const line of lines) console.log(`  ${line}`)
      } catch (error) {
        failed = true
        console.error(`  更新失败：${error instanceof Error ? error.message : String(error)}`)
      }
    }
    if (failed) process.exitCode = 1
  })

program.command('list')
  .description('列出 kit 资源与各目标工具映射')
  .action(() => {
    const skills = listSkills()
    console.log(`yushe-agent-kit v${version()} 资源清单\n`)
    console.log(`skills (${skills.length})`)
    for (const s of skills) {
      const entry = skillEntryName(s)
      console.log(`  ${s}${entry === s ? '' : `  ⚠ SKILL.md name 不一致: ${entry}`}`)
    }
    console.log(`\nrules (${listRules().length})`)
    for (const r of listRules()) console.log(`  ${r}`)
    console.log(`\ndsh plugins (${listDshPlugins().length})`)
    for (const p of listDshPlugins()) console.log(`  ${p}`)
    console.log('\n目标工具映射：')
    for (const name of targetNames()) {
      const t = targets[name]
      console.log(`  ${name.padEnd(9)} ${t.verified ? '✓' : '未核实'}  ${t.notes}`)
    }
  })

program.command('doctor')
  .description('诊断安装问题（遮蔽、双源、失效软链、命名不一致）')
  .action(async () => {
    let bad = 0
    const report = (line: string) => {
      if (line.startsWith('FAIL')) bad += 1
      console.log(`  ${line}`)
    }

    console.log('kit 层：')
    for (const s of listSkills()) {
      const entry = skillEntryName(s)
      if (entry === undefined) report(`FAIL ${s}/SKILL.md 缺少 name 字段或 frontmatter`)
      else if (entry !== s) report(`FAIL ${s} 目录名与 name: ${entry} 不一致`)
      if (!existsSync(join(paths.skills, s, 'SKILL.md'))) report(`FAIL ${s} 缺少 SKILL.md`)
    }
    if (listRules().length === 0) report('WARN 没有发现任何 rule')

    for (const name of ['dsh', 'claude']) {
      console.log(`\n${getTarget(name).label}：`)
      const mod = await loadInstaller(name)
      for (const line of mod.doctor()) report(line)
    }
    console.log(bad === 0 ? '\n结论：未发现问题' : `\n结论：${bad} 项失败需要处理`)
    if (bad > 0) process.exitCode = 1
  })

export async function run(argv?: string[]): Promise<number> {
  if (argv === undefined) {
    await program.parseAsync(process.argv)
  } else {
    await program.parseAsync(argv, { from: 'user' })
  }
  return typeof process.exitCode === 'number' ? process.exitCode : 0
}