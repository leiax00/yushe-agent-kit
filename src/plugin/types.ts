/**
 * Structural types for the DSH surfaces the plugin touches. Kept local and
 * dependency-free on purpose: the package may be installed via
 * `dsh plugin add link:` whose own dependencies are not installed.
 */

interface SkillSummary {
  readonly name: string
  readonly description: string
  readonly invocation: { modelInvocable: boolean; userInvocable: boolean }
  readonly provider: string
  readonly source: string
  readonly resourceBase: { kind: string; path: string }
}

export type SkillCandidate = SkillSummary & {
  readonly rank: number
  readonly locator: unknown
}

export interface SkillControl {
  invalidate(): void
}

export interface KitContext {
  readonly logger?: { warn(message: string): void }
  readonly skills: {
    registerProvider(
      make: (control: SkillControl) => {
        readonly name: string
        readonly list: (options: { signal?: AbortSignal }) =>
          Promise<readonly SkillCandidate[] | { candidates: readonly SkillCandidate[]; complete: boolean }>
        readonly get: (candidate: SkillCandidate, options: { signal?: AbortSignal }) =>
          Promise<SkillSummary & { readonly content: string } | undefined>
      },
    ): void
  }
  on(event: string, ...args: unknown[]): void
  [key: string]: unknown
}

/** Row-level toggles: one package, two bundle rows (skills / rules). */
export interface KitPluginConfig {
  registerSkills?: boolean
  registerRules?: boolean
}
