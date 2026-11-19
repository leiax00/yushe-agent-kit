/**
 * yushe-agent-kit whole-package DSH plugin.
 *
 * One `dsh plugin add @leiax00/yushe-agent-kit` installs the whole kit as
 * two independently toggleable bundle rows: the skills row registers a
 * SkillProvider for `.agents/skills/`, the rules row registers two-layer
 * rules injection (project root first, package defaults behind). See
 * `skills.ts` / `rules.ts` for each component.
 */
import { registerSkillsProvider } from './skills.js'
import { registerRulesInjector } from './rules.js'
import type { KitContext, KitPluginConfig } from './types.js'

/** Cordis plugin identity. */
export const name = 'yushe-agent-kit'
/** Registry used by the skills component. */
export const inject = ['skills']

export function apply(ctx: KitContext, config: KitPluginConfig = {}): void {
  const { registerSkills = true, registerRules = true } = config
  if (registerSkills) registerSkillsProvider(ctx)
  if (registerRules) registerRulesInjector(ctx)
}
