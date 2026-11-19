/** DSH bundle entry that registers only the kit rules injector. */
import { registerRulesInjector } from './rules.js'
import type { KitContext } from './types.js'

export function apply(ctx: KitContext): void {
  registerRulesInjector(ctx)
}
