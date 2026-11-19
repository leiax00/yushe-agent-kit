/** DSH bundle entry that registers only the kit skills provider. */
import { registerSkillsProvider } from './skills.js'
import type { KitContext } from './types.js'

export const inject = ['skills']

export function apply(ctx: KitContext): void {
  registerSkillsProvider(ctx)
}
