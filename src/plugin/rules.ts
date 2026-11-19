/**
 * Rules component: two-layer rules injection in one pass — the project's
 * rules root (`.agents` > `.claude` > `.opencode` > `.cursor`, first present
 * wins) plus the package's own `.agents/rules/` defaults, skipped per file
 * when the project already carries the same rule path. The injection state
 * machine lives in `rules-engine/engine.ts`.
 */
import { makeRuleInjector } from './rules-engine/engine.js'
import { scanRules, scanRulesDir, type ProjectRules, type Warn } from './rules-engine/scan.js'
import { RULES_ROOT } from './paths.js'
import type { KitContext } from './types.js'

/** Combine project rules and unshadowed kit defaults for one session cwd. */
async function loadRules(cwd: string, signal: AbortSignal | undefined, warn: Warn): Promise<ProjectRules> {
  const project = await scanRules(cwd, signal, warn)
  const kitRules = await scanRulesDir(RULES_ROOT, signal, warn)
  const projectPaths = new Set(project.rules.map(rule => rule.relPath))
  return {
    root: project.root,
    rules: [...project.rules, ...kitRules.filter(rule => !projectPaths.has(rule.relPath))],
  }
}

/** Register the two-layer rules injector on `ctx`. */
export function registerRulesInjector(ctx: KitContext): void {
  makeRuleInjector(ctx, { sourceKind: 'yushe-agent-kit-rules', loadRules })
}
