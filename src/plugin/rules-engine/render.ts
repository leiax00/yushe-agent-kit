/**
 * Injection message rendering: byte-budgeted batches of due rules framed as
 * a system-reminder user message.
 */
import { RULES_ROOTS, type ParsedRule } from './scan.js'

/** Maximum UTF-8 bytes of one rendered rules message. */
const MAX_TOTAL_BYTES = 65536
/** Bytes reserved for the frame, intro, and budget marker below the total cap. */
const FRAME_SLACK_BYTES = 512

const FRAME_CLOSE = '</system-reminder>'
const FRAME_CLOSE_ESCAPED = '<\\/system-reminder>'
const INTRO = 'The following project rules come from the project root\'s rules directory '
  + `(checked in priority order: ${RULES_ROOTS.join(', ')}; first present wins). `
  + 'Use them as guidance when applicable. They do not override system, developer, or direct user instructions.'

function escapeFrameClose(text: string): string {
  return text.replaceAll(FRAME_CLOSE, FRAME_CLOSE_ESCAPED)
}

export interface RenderedBatch {
  readonly text: string
  readonly included: readonly string[]
}

/**
 * Render one injection batch: `due` rules in the given order, byte-budgeted.
 * @returns framed text plus the display paths actually represented, or
 * `undefined` when nothing fits the budget.
 */
export function renderBatch(due: readonly ParsedRule[]): RenderedBatch | undefined {
  const sections: string[] = []
  const omitted: string[] = []
  const included: string[] = []
  let usedBytes = 0
  for (const rule of due) {
    const heading = rule.globs === undefined
      ? `Rules from: ${rule.displayPath}`
      : `Rules from: ${rule.displayPath} (apply to work on files matching their paths globs)`
    const section = `${heading}\n\n${rule.body}`
    const sectionBytes = Buffer.byteLength(section, 'utf8')
    if (usedBytes + sectionBytes > MAX_TOTAL_BYTES - FRAME_SLACK_BYTES) {
      omitted.push(rule.displayPath)
      continue
    }
    usedBytes += sectionBytes
    sections.push(section)
    included.push(rule.displayPath)
  }
  if (included.length === 0) return undefined
  const parts = [INTRO, ...sections]
  if (omitted.length > 0) {
    parts.push(`Rules budget ${MAX_TOTAL_BYTES} bytes: omitted ${omitted.join(', ')}`)
  }
  return {
    text: `<system-reminder>\n${escapeFrameClose(parts.join('\n\n'))}\n${FRAME_CLOSE}`,
    included,
  }
}
