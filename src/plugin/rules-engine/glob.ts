/**
 * Minimal glob compiler for rule gate lists: project-relative POSIX paths.
 * Supported: a double-star segment (any number of directories, zero included
 * when it precedes a slash), single-star within one segment, a
 * single-character wildcard, brace alternations, and bracket character
 * classes. No negation or extglobs.
 */

const globCache = new Map<string, RegExp>()

function escapeLiteral(ch: string): string {
  return /[.*+?^${}()|[\]\\]/.test(ch) ? `\\${ch}` : ch
}

/** Compile one glob to an anchored RegExp over project-relative POSIX paths. */
export function compileGlob(pattern: string): RegExp {
  let compiled = globCache.get(pattern)
  if (compiled === undefined) {
    compiled = new RegExp(`^${compileGlobSource(pattern)}$`)
    globCache.set(pattern, compiled)
  }
  return compiled
}

/** Compile a glob to an unanchored RegExp source. */
function compileGlobSource(pattern: string): string {
  let source = ''
  let i = 0
  while (i < pattern.length) {
    const ch = pattern[i]
    if (ch === '{') {
      const close = pattern.indexOf('}', i)
      if (close < 0) {
        source += escapeLiteral(ch)
        i += 1
        continue
      }
      const alternatives = pattern.slice(i + 1, close)
        .split(',')
        .map(alternative => compileGlobSource(alternative))
      source += `(?:${alternatives.join('|')})`
      i = close + 1
      continue
    }
    if (ch === '[') {
      const close = pattern.indexOf(']', i + 1)
      if (close < 0) {
        source += escapeLiteral(ch)
        i += 1
        continue
      }
      let body = pattern.slice(i + 1, close)
      let negated = ''
      if (body.startsWith('!')) {
        negated = '^'
        body = body.slice(1)
      }
      body = body.replace(/\\/g, '\\\\').replace(/\^/g, '\\^')
      source += `[${negated}${body}]`
      i = close + 1
      continue
    }
    if (ch === '*') {
      let j = i + 1
      while (pattern[j] === '*') j += 1
      if (j > i + 1) {
        if (pattern[j] === '/') {
          // A `**/` boundary matches zero or more whole segments.
          source += '(?:[^/]*/)*'
          i = j + 1
        } else {
          source += '.*'
          i = j
        }
        continue
      }
      source += '[^/]*'
      i += 1
      continue
    }
    if (ch === '?') {
      source += '[^/]'
      i += 1
      continue
    }
    source += escapeLiteral(ch)
    i += 1
  }
  return source
}
