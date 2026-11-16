export interface OnlinePrefs {
  fontSize: number
  lineHeight: number
  codeFontSize: number
  editorLineWidth: string
  focus: boolean
  typewriter: boolean
  showToc: boolean
  theme: string
  hideQuickInsertHint: boolean
  autoPairBracket: boolean
  autoPairMarkdownSyntax: boolean
  autoPairQuote: boolean
  codeBlockLineNumbers: boolean
  wrapCodeBlocks: boolean
  trimCodeBlockEmptyLines: boolean
}

const KEY = 'markbreak.online'

const DEFAULTS: OnlinePrefs = {
  fontSize: 16,
  lineHeight: 1.6,
  codeFontSize: 14,
  editorLineWidth: '',
  focus: false,
  typewriter: false,
  showToc: true,
  theme: 'light',
  hideQuickInsertHint: false,
  autoPairBracket: true,
  autoPairMarkdownSyntax: true,
  autoPairQuote: true,
  codeBlockLineNumbers: false,
  wrapCodeBlocks: false,
  trimCodeBlockEmptyLines: true
}

const WIDTH = /^(?:[0-9]+(?:ch|px|%))?$/

export function loadPrefs(knownThemes: readonly string[]): OnlinePrefs {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return { ...DEFAULTS }
    const parsed = JSON.parse(raw) as Partial<OnlinePrefs>
    const theme = typeof parsed.theme === 'string' && knownThemes.includes(parsed.theme)
      ? parsed.theme
      : DEFAULTS.theme
    const width = typeof parsed.editorLineWidth === 'string' && WIDTH.test(parsed.editorLineWidth)
      ? parsed.editorLineWidth
      : DEFAULTS.editorLineWidth
    return {
      fontSize: numberIn(parsed.fontSize, 12, 32, DEFAULTS.fontSize),
      lineHeight: numberIn(parsed.lineHeight, 1, 2.4, DEFAULTS.lineHeight),
      codeFontSize: numberIn(parsed.codeFontSize, 12, 28, DEFAULTS.codeFontSize),
      editorLineWidth: width,
      focus: flag(parsed.focus, DEFAULTS.focus),
      typewriter: flag(parsed.typewriter, DEFAULTS.typewriter),
      showToc: flag(parsed.showToc, DEFAULTS.showToc),
      theme,
      hideQuickInsertHint: flag(parsed.hideQuickInsertHint, DEFAULTS.hideQuickInsertHint),
      autoPairBracket: flag(parsed.autoPairBracket, DEFAULTS.autoPairBracket),
      autoPairMarkdownSyntax: flag(parsed.autoPairMarkdownSyntax, DEFAULTS.autoPairMarkdownSyntax),
      autoPairQuote: flag(parsed.autoPairQuote, DEFAULTS.autoPairQuote),
      codeBlockLineNumbers: flag(parsed.codeBlockLineNumbers, DEFAULTS.codeBlockLineNumbers),
      wrapCodeBlocks: flag(parsed.wrapCodeBlocks, DEFAULTS.wrapCodeBlocks),
      trimCodeBlockEmptyLines: flag(parsed.trimCodeBlockEmptyLines, DEFAULTS.trimCodeBlockEmptyLines)
    }
  } catch {
    return { ...DEFAULTS }
  }
}

export function savePrefs(prefs: OnlinePrefs): void {
  localStorage.setItem(KEY, JSON.stringify(prefs))
}

function flag(value: unknown, fallback: boolean): boolean {
  return typeof value === 'boolean' ? value : fallback
}

function numberIn(value: unknown, min: number, max: number, fallback: number): number {
  const n = typeof value === 'number' ? value : Number(value)
  if (!Number.isFinite(n)) return fallback
  return Math.min(max, Math.max(min, n))
}
