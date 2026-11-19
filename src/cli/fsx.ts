/**
 * Filesystem helpers: symlink-first installation with copy fallback.
 */
import {
  symlinkSync, unlinkSync, mkdirSync, cpSync, existsSync,
  lstatSync, readlinkSync, statSync, rmSync,
} from 'node:fs'
import { dirname, relative } from 'node:path'

export type LinkState = 'absent' | 'symlink-ok' | 'symlink-broken' | 'dir' | 'file'
export type PlaceAction = 'kept' | 'linked' | 'copied' | 'conflict'

function lstatIfExists(target: string): boolean {
  try {
    lstatSync(target)
    return true
  } catch {
    return false
  }
}

/** What currently sits at `target` (for reporting and doctor). */
export function linkState(target: string): LinkState {
  if (!lstatIfExists(target)) return 'absent'
  const st = lstatSync(target)
  if (st.isSymbolicLink()) {
    try {
      return statSync(target) ? 'symlink-ok' : 'symlink-broken'
    } catch {
      return 'symlink-broken'
    }
  }
  return st.isDirectory() ? 'dir' : 'file'
}

/** Where an existing symlink points, or undefined. */
export function symlinkTarget(target: string): string | undefined {
  try {
    return readlinkSync(target)
  } catch {
    return undefined
  }
}

/**
 * Install `source` (a directory or file) at `target` as symlink, else copy.
 * `relative: true` creates the symlink with a path relative to the link's
 * directory, keeping the project tree movable.
 */
export function place(
  source: string,
  target: string,
  { copy = false, relative = false } = {},
): PlaceAction {
  const linkTo = relative ? relLinkTarget(source, target) : source
  const state = linkState(target)
  if (state === 'symlink-ok' && symlinkTarget(target) === linkTo) return 'kept'
  if (state === 'dir' || state === 'file') return 'conflict' // user-owned install, refuse to clobber
  if (state.startsWith('symlink')) unlinkSync(target)
  mkdirSync(dirname(target), { recursive: true })
  if (copy) {
    cpSync(source, target, { recursive: true })
    return 'copied'
  }
  try {
    symlinkSync(linkTo, target)
    return 'linked'
  } catch {
    cpSync(source, target, { recursive: true })
    return 'copied'
  }
}

/** Symlink target for `source` relative to `target`'s directory. */
export function relLinkTarget(source: string, target: string): string {
  return relative(dirname(target), source)
}

/** Refresh a previously copied install (or create one). */
export function refreshCopy(source: string, target: string): 'symlink' | 'copied' {
  const state = linkState(target)
  if (state === 'symlink-ok') return 'symlink'
  if (state !== 'absent') rmSync(target, { recursive: true, force: true })
  mkdirSync(dirname(target), { recursive: true })
  cpSync(source, target, { recursive: true })
  return 'copied'
}
