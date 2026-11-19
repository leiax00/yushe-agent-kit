/**
 * Package layout anchors shared by plugin components. Every file in
 * `dist/plugin/` sits two levels under the package root, in both the dev
 * checkout and the published layout.
 */
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

/** dist/plugin/ → package root. */
export const PKG_ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..')

export const SKILLS_ROOT = join(PKG_ROOT, '.agents', 'skills')
export const RULES_ROOT = join(PKG_ROOT, '.agents', 'rules')
