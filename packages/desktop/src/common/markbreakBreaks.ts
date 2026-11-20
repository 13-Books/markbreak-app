/**
 * Flow-break helpers aligned with dialect/markbreak tools/markbreak.lua (0.7.0).
 * Folio pages for the page view are delimited by these markers — not by thematic breaks.
 */

export type FlowBreakKind = 'column' | 'page' | 'odd' | 'even'

/** Canonical manuscript lines for each kind. */
export const FLOW_BREAK_LINES: Record<FlowBreakKind, string> = {
  column: '//break',
  page: '//break page',
  odd: '//break odd',
  even: '//break even'
}

// Optional empty `{}` only — reject `\newpage}` / `\newpage{`.
const NEWPAGE_RE = /^\\newpage(\{\})?$/
const PAGEBREAK_RE = /^\\pagebreak(\{\})?$/
const COLUMNBREAK_RE = /^\\columnbreak(\{\})?$/
const CLEARDOUBLE_RE = /^\\cleardoublepage(\{\})?$/

/** A line that is only a flow break (trimmed). Thematic `---` is not a flow break. */
export const breakKind = (command: string | null | undefined): FlowBreakKind | null => {
  if (command == null) return null
  const s = command.replace(/^\s+/, '').replace(/\s+$/, '')
  if (!s) return null
  if (s === '//break page' || NEWPAGE_RE.test(s) || PAGEBREAK_RE.test(s)) return 'page'
  if (s === '//break' || s === '\f' || COLUMNBREAK_RE.test(s)) return 'column'
  if (s === '//break odd' || CLEARDOUBLE_RE.test(s)) return 'odd'
  if (s === '//break even') return 'even'
  return null
}

export const isFlowBreakLine = (line: string): boolean => breakKind(line) != null

/**
 * Rewrite legacy TeX page markers to `//break page` so the manuscript stays
 * in the published profile. Column / odd / even TeX forms stay as-is for the filter.
 */
export const migrateAuthorBreaks = (markdown: string): string => {
  return markdown
    .split(/\r\n|\n|\r/)
    .map((line) => {
      const trimmed = line.replace(/^\s+/, '').replace(/\s+$/, '')
      if (NEWPAGE_RE.test(trimmed) || PAGEBREAK_RE.test(trimmed)) return FLOW_BREAK_LINES.page
      return line
    })
    .join('\n')
}

/** Split a manuscript into folio page bodies (text between flow breaks). Breaks are omitted. */
export const splitFolioPages = (markdown: string): string[] => {
  const lines = markdown.replace(/\r\n?/g, '\n').split('\n')
  const pages: string[] = []
  let current: string[] = []
  const flush = () => {
    pages.push(current.join('\n').replace(/^\n+/, '').replace(/\n+$/, ''))
    current = []
  }
  for (const line of lines) {
    if (isFlowBreakLine(line)) {
      flush()
    } else {
      current.push(line)
    }
  }
  flush()
  if (pages.length === 0) return ['']
  return pages
}

/** Join folio page bodies with the normal advance (`//break`). */
export const joinFolioPages = (pages: string[], kind: FlowBreakKind = 'column'): string => {
  const marker = FLOW_BREAK_LINES[kind]
  return pages
    .map((p) => p.replace(/^\n+/, '').replace(/\n+$/, ''))
    .join(`\n\n${marker}\n\n`)
}

/**
 * Markdown snippet to insert at the caret: blank lines around the break so the
 * filter sees an isolated paragraph (spec §5).
 */
export const flowBreakInsertSnippet = (kind: FlowBreakKind = 'column'): string =>
  `\n\n${FLOW_BREAK_LINES[kind]}\n\n`

/**
 * Expand a trailing `/np` token (new page) into a column break when the user
 * confirms with Space or Enter. Returns null when expansion does not apply.
 */
export const expandNpToken = (
  textBeforeCaret: string,
  trigger: ' ' | '\n'
): { replaceFrom: number, insert: string } | null => {
  const match = textBeforeCaret.match(/(^|[\s])\/np$/)
  if (!match) return null
  const tokenStart = textBeforeCaret.length - 3
  const insert = trigger === '\n'
    ? `${FLOW_BREAK_LINES.column}\n\n`
    : `${FLOW_BREAK_LINES.column}\n\n`
  return { replaceFrom: tokenStart, insert }
}

/** Spread pairing: page 1 alone on recto (blank verso), then 2|3, 4|5, … */
export const buildSpreadPairs = <T>(pages: T[]): Array<{ verso: T | null, recto: T | null }> => {
  const spreads: Array<{ verso: T | null, recto: T | null }> = []
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
