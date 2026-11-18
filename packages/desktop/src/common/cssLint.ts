/**
 * Lint a picture-book style sheet against the RigWorks css.md mapping subset
 * that MarkBreak preview understands. Unmapped selectors / properties are listed.
 */

const MAPPED_PROPERTIES = new Set([
  'font-family',
  'font-size',
  'font-weight',
  'font-style',
  'line-height',
  'color',
  'text-align',
  'text-align-last',
  'margin-top',
  'margin-bottom',
  'margin-left',
  'margin-right',
  'text-indent',
  'letter-spacing',
  'hyphens',
  'orphans',
  'widows',
  'font-kerning',
  'vertical-align',
  'text-transform',
  'font-variant-caps',
  'text-decoration',
  'text-decoration-line',
  'object-fit',
  'object-position',
  'border-radius',
  'border',
  'border-style',
  'background-color',
  'opacity',
  'mix-blend-mode',
  'float',
  'shape-outside',
  'shape-margin',
  'shape-image-threshold',
  'padding',
  'column-count',
  'columns',
  'column-gap',
  'image-resolution',
  'size',
  'bleed',
  'margin'
])

export interface CssLintIssue {
  kind: 'property' | 'selector' | 'at-rule'
  message: string
  value?: string
}

/** Strip comments and split rough rule blocks. Not a full CSS parser. */
export const lintBookCss = (css: string): CssLintIssue[] => {
  const issues: CssLintIssue[] = []
  const stripped = css.replace(/\/\*[\s\S]*?\*\//g, '')
  const ruleRe = /([^{}@]+)\{([^{}]*)\}/g
  let match: RegExpExecArray | null
  while ((match = ruleRe.exec(stripped)) !== null) {
    const selector = match[1].trim()
    const body = match[2]
    if (!selector) continue
    for (const decl of body.split(';')) {
      const part = decl.trim()
      if (!part) continue
      const colon = part.indexOf(':')
      if (colon < 0) continue
      const prop = part.slice(0, colon).trim().toLowerCase()
      const value = part.slice(colon + 1).trim()
      if (prop.startsWith('--rig-')) continue
      if (!MAPPED_PROPERTIES.has(prop)) {
        issues.push({
          kind: 'property',
          message: `Unmapped property ${prop}`,
          value
        })
      }
    }
  }
  // Unknown at-rules other than @page / @font-face
  for (const at of stripped.matchAll(/@([a-z-]+)/gi)) {
    const name = at[1].toLowerCase()
    if (name !== 'page' && name !== 'font-face') {
      issues.push({ kind: 'at-rule', message: `Unmapped at-rule @${name}` })
    }
  }
  return issues
}
