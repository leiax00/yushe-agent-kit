/**
 * Target registry — the single authority for "which resource goes where for
 * each tool". Conventions are verified, not guessed (AGENTS.md rule):
 * unverified targets refuse to install until their entries carry verified
 * paths.
 */
import type { Installer } from './types.js'

export interface TargetEntry {
  label: string
  verified: boolean
  notes: string
  installer?: string
}

export const targets: Record<string, TargetEntry> = {
  dsh: {
    label: 'DSH (DeepSeek Harness)',
    installer: './dsh.js',
    verified: true,
    notes: '默认用户级：skills 软链到 DSH_HOME/skills；项目级（带路径）：落位项目 .agents/，DSH 直接读取，rules 经 yushe-user-rules 插件注入',
  },
  claude: {
    label: 'Claude Code',
    installer: './claude.js',
    verified: true,
    notes: '默认用户级：skills 软链到 ~/.claude/skills，rules 复制到项目 .claude/rules/；项目级（带路径）：kit 落位 .agents/ 后 .claude/{skills,rules} 相对软链',
  },
  opencode: { label: 'OpenCode', verified: false, notes: '目录约定未核实，暂不安装；核实后在此登记映射' },
  codex: { label: 'Codex', verified: false, notes: '目录约定未核实，暂不安装；核实后在此登记映射' },
  gemini: { label: 'Gemini CLI', verified: false, notes: '目录约定未核实，暂不安装；核实后在此登记映射' },
}

export function targetNames(): string[] {
  return Object.keys(targets)
}

export function getTarget(name: string): TargetEntry {
  const t = targets[name]
  if (!t) throw new Error(`未知目标工具：${name}（可用：${targetNames().join(', ')}）`)
  return t
}

export async function loadInstaller(name: string): Promise<Installer> {
  const t = getTarget(name)
  if (!t.verified || !t.installer) {
    throw new Error(`${t.label} 的目录约定尚未核实，拒绝凭印象安装（见 src/cli/targets/registry.ts）`)
  }
  return import(t.installer) as Promise<Installer>
}
