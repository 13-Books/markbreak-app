/** Closed print roles from MarkBreak specification §3.1. */
export const MARKBREAK_ROLES = [
  'dedication',
  'epigraph',
  'preface',
  'part',
  'chapter',
  'appendix',
  'epilog',
  'afterword',
  'colophon',
  'toc'
] as const

export type MarkbreakRole = (typeof MARKBREAK_ROLES)[number]

export interface BookFrontMatter {
  role?: string
  meta?: string
  layout?: string
  stylesheet?: string
  spine?: Array<{ file: string; role?: string }>
  raw: Record<string, unknown>
}

const FRONT_MATTER_RE = /^---\r?\n([\s\S]*?)\r?\n---/

/** Minimal YAML grab for the keys the writer panel edits (not a full YAML parser). */
export const parseBookFrontMatter = (markdown: string): BookFrontMatter => {
  const match = FRONT_MATTER_RE.exec(markdown)
  if (!match) return { raw: {} }
  const yaml = match[1]
  const raw: Record<string, unknown> = {}
  const scalar = (key: string): string | undefined => {
    const m = new RegExp(`^${key}:\\s*["']?([^"'\\n]*)["']?\\s*$`, 'm').exec(yaml)
    return m?.[1]?.trim() || undefined
  }
  for (const key of ['role', 'meta', 'layout', 'stylesheet', 'title'] as const) {
    const v = scalar(key)
    if (v) raw[key] = v
  }
  const spine: Array<{ file: string; role?: string }> = []
  const spineBlock = /^spine:\s*\n((?:[ \t]+-[\s\S]*?)(?=\n[^\s]|\n*$))/m.exec(`\n${yaml}\n`)
  if (spineBlock) {
    for (const line of spineBlock[1].split('\n')) {
      const file = /file:\s*["']?([^"',}\n]+)["']?/.exec(line)
      if (!file) continue
      const role = /role:\s*["']?([^"',}\n]+)["']?/.exec(line)
      spine.push({ file: file[1].trim(), role: role?.[1]?.trim() })
    }
    if (spine.length) raw.spine = spine
  }
  return {
    role: typeof raw.role === 'string' ? raw.role : undefined,
    meta: typeof raw.meta === 'string' ? raw.meta : undefined,
    layout: typeof raw.layout === 'string' ? raw.layout : undefined,
    stylesheet: typeof raw.stylesheet === 'string' ? raw.stylesheet : undefined,
    spine: spine.length ? spine : undefined,
    raw
  }
}

export const applyBookFrontMatter = (
  markdown: string,
  next: Partial<Pick<BookFrontMatter, 'role' | 'meta' | 'layout' | 'stylesheet'>>
): string => {
  const body = markdown.replace(FRONT_MATTER_RE, '').replace(/^\r?\n/, '')
  const current = parseBookFrontMatter(markdown)
  const role = next.role !== undefined ? next.role : current.role
  const meta = next.meta !== undefined ? next.meta : current.meta
  const layout = next.layout !== undefined ? next.layout : current.layout
  const stylesheet = next.stylesheet !== undefined ? next.stylesheet : current.stylesheet
  const lines = ['---']
  if (role) lines.push(`role: ${role}`)
  if (meta) lines.push(`meta: ${meta}`)
  if (layout) lines.push(`layout: ${layout}`)
  if (stylesheet) lines.push(`stylesheet: ${stylesheet}`)
  if (current.spine?.length) {
    lines.push('spine:')
    for (const entry of current.spine) {
      const rolePart = entry.role ? `, role: ${entry.role}` : ''
      lines.push(`  - { file: "${entry.file}"${rolePart} }`)
    }
  }
  lines.push('---', '', body.replace(/^\n+/, ''))
  return `${lines.join('\n').replace(/\n+$/, '')}\n`
}

export const isKnownRole = (role: string | undefined): role is MarkbreakRole =>
  !!role && (MARKBREAK_ROLES as readonly string[]).includes(role)
