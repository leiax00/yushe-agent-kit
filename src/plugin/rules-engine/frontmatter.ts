/**
 * YAML-lite frontmatter parsing for rule files: gate lists (`paths`, with
 * Cursor's `globs` alias) and boolean flags (`alwaysApply`). No YAML
 * dependency on purpose — the plugin must run with Node builtins only.
 */

function unquote(value: string): string {
  if (value.length >= 2 && ((value.startsWith('"') && value.endsWith('"'))
    || (value.startsWith("'") && value.endsWith("'")))) {
    return value.slice(1, -1)
  }
  return value
}

/** Split a comma list on top-level commas, honoring quotes and brace depth. */
function splitCommaList(text: string): string[] {
  const items: string[] = []
  let current = ''
  let quote: string | undefined
  let depth = 0
  for (const ch of text) {
    if (quote !== undefined) {
      current += ch
      if (ch === quote) quote = undefined
    } else if (ch === '"' || ch === "'") {
      quote = ch
      current += ch
    } else if (ch === '{' || ch === '[') {
      depth += 1
      current += ch
    } else if (ch === '}' || ch === ']') {
      depth = Math.max(0, depth - 1)
      current += ch
    } else if (ch === ',' && depth === 0) {
      items.push(current)
      current = ''
    } else {
      current += ch
    }
  }
  items.push(current)
  return items.map(item => unquote(item.trim())).filter(item => item.length > 0)
}

/**
 * Extract the frontmatter gate list from YAML text. The `paths` key is the
 * native form; Cursor's `globs` key is accepted as an alias whose bare scalar
 * may be a comma-separated list. Supported shapes: inline array, single
 * scalar, and block dash lists. Other keys are ignored.
 * @returns whether a gate key is present and its string list.
 */
export function parsePathsField(yamlText: string): { present: boolean; globs?: string[] } {
  const lines = yamlText.split(/\r?\n/)
  for (let i = 0; i < lines.length; i += 1) {
    const match = lines[i].match(/^\s*(paths|globs)\s*:\s*(.*)$/)
    if (match === null) continue
    const inline = match[2].trim()
    if (inline.length > 0) {
      if (inline.startsWith('[')) {
        const inner = inline.replace(/^\[/, '').replace(/\]$/, '').trim()
        if (inner.length === 0) return { present: true, globs: [] }
        return { present: true, globs: splitCommaList(inner) }
      }
      if (match[1] === 'globs') {
        // Cursor allows a bare comma-separated scalar for its globs key.
        return { present: true, globs: splitCommaList(inline) }
      }
      return { present: true, globs: [unquote(inline)] }
    }
    const globs: string[] = []
    for (let j = i + 1; j < lines.length; j += 1) {
      const item = lines[j].match(/^\s+-\s*(.*)$/)
      if (item === null) break
      const value = unquote(item[1].trim())
      if (value.length > 0) globs.push(value)
    }
    return { present: true, globs }
  }
  return { present: false, globs: undefined }
}

/**
 * Whether the frontmatter sets a boolean key to true; Cursor's
 * `alwaysApply: true` forces unconditional loading.
 */
export function parseBooleanTrue(yamlText: string, key: string): boolean {
  for (const line of yamlText.split(/\r?\n/)) {
    const match = line.match(new RegExp(`^\\s*${key}\\s*:\\s*(.*)$`))
    if (match === null) continue
    return unquote(match[1].trim()).toLowerCase() === 'true'
  }
  return false
}

/**
 * Split a leading `---` YAML frontmatter block. @returns the block's YAML
 * text (without markers) and the body; both empty/absent when no block.
 */
export function splitFrontmatter(raw: string): { yaml?: string; body: string } {
  if (!raw.startsWith('---\n') && !raw.startsWith('---\r\n')) return { yaml: undefined, body: raw }
  let lineStart = raw.indexOf('\n') + 1
  while (lineStart <= raw.length) {
    const nextNewline = raw.indexOf('\n', lineStart)
    const lineEnd = nextNewline < 0 ? raw.length : nextNewline
    const line = raw.slice(lineStart, lineEnd).replace(/\r$/, '')
    if (line === '---') {
      return {
        yaml: raw.slice(raw.indexOf('\n') + 1, lineStart - 1),
        body: raw.slice(nextNewline < 0 ? raw.length : nextNewline + 1),
      }
    }
    if (nextNewline < 0) return { yaml: undefined, body: raw }
    lineStart = nextNewline + 1
  }
  return { yaml: undefined, body: raw }
}
