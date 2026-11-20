/** Slim MarkBreak flow-break helpers for the online pages view. */

export type FlowBreakKind = 'column' | 'page' | 'odd' | 'even'

/** Canonical manuscript lines — exact match only (after trim). */
export const FLOW_BREAK_LINES: Record<FlowBreakKind, string> = {
  column: '//break',
  page: '//break page',
  odd: '//break odd',
  even: '//break even'
}

// TeX forms: optional empty `{}` only — not `\newpage}` / `\newpage{`.
const NEWPAGE_RE = /^\\newpage(\{\})?$/
const PAGEBREAK_RE = /^\\pagebreak(\{\})?$/
const COLUMNBREAK_RE = /^\\columnbreak(\{\})?$/
const CLEARDOUBLE_RE = /^\\cleardoublepage(\{\})?$/

export const breakKind = (command: string | null | undefined): FlowBreakKind | null => {
  if (command == null) return null
  const s = command.replace(/^\s+/, '').replace(/\s+$/, '')
  if (!s) return null
  if (s === FLOW_BREAK_LINES.page || NEWPAGE_RE.test(s) || PAGEBREAK_RE.test(s)) return 'page'
  if (s === FLOW_BREAK_LINES.column || s === '\f' || COLUMNBREAK_RE.test(s)) return 'column'
  if (s === FLOW_BREAK_LINES.odd || CLEARDOUBLE_RE.test(s)) return 'odd'
  if (s === FLOW_BREAK_LINES.even) return 'even'
  return null
}

export const isFlowBreakLine = (line: string): boolean => breakKind(line) != null

/** Spread pairing: page 1 alone on recto, then 2|3, 4|5, … */
export const buildSpreadPairs = <T>(pages: T[]): Array<{ verso: T | null; recto: T | null }> => {
  const spreads: Array<{ verso: T | null; recto: T | null }> = []
  if (pages.length === 0) return [{ verso: null, recto: null }]
  spreads.push({ verso: null, recto: pages[0] ?? null })
  for (let i = 1; i < pages.length; i += 2) {
    spreads.push({
      verso: pages[i] ?? null,
      recto: pages[i + 1] ?? null
    })
  }
  return spreads
}
