/** Expand a MarkBreak root `book.md` (YAML `spine`) into one markdown document for the online editor. */

export type SpineEntry = { file: string; role?: string }

export function splitFrontMatter(md: string): { yaml: string | null; body: string } {
  const text = md.replace(/^\uFEFF/, '')
  if (!text.startsWith('---\n') && !text.startsWith('---\r\n')) {
    return { yaml: null, body: text }
  }
  const end = text.indexOf('\n---', 3)
  if (end === -1) return { yaml: null, body: text }
  const after = text.slice(end + 4)
  const body = after.startsWith('\n') ? after.slice(1) : after.replace(/^\r\n/, '')
  return { yaml: text.slice(4, end).replace(/^\r\n/, '').replace(/^\n/, ''), body }
}

/**
 * Parse spine entries from MarkBreak-style YAML.
 * Supports `{ file: "a.md", role: chapter }` and nested `file:` / `role:` maps.
 */
export function parseSpine(yaml: string): SpineEntry[] | null {
  const lines = yaml.replace(/\r\n/g, '\n').split('\n')
  let i = 0
  while (i < lines.length && !/^spine\s*:/.test(lines[i])) i++
  if (i >= lines.length) return null
  i++
  const entries: SpineEntry[] = []
  while (i < lines.length) {
    const line = lines[i]
    if (/^\S/.test(line) && line.trim()) break
    const flow = line.match(
      /^\s*-\s*\{\s*file:\s*"([^"]+)"\s*(?:,\s*role:\s*([A-Za-z0-9_-]+))?\s*\}\s*$/
    )
    if (flow) {
      entries.push({ file: flow[1], role: flow[2] })
      i++
      continue
    }
    if (/^\s*-\s*$/.test(line) || /^\s*-\s+file\s*:/.test(line)) {
      let file: string | undefined
      let role: string | undefined
      if (/^\s*-\s+file\s*:/.test(line)) {
        const m = line.match(/file\s*:\s*"([^"]+)"|file\s*:\s*(\S+)/)
        file = m?.[1] ?? m?.[2]
      }
      i++
      while (i < lines.length && /^\s+/.test(lines[i]) && !/^\s*-\s/.test(lines[i])) {
        const fm = lines[i].match(/^\s+file\s*:\s*"([^"]+)"|^\s+file\s*:\s*(\S+)/)
        if (fm) file = fm[1] ?? fm[2]
        const rm = lines[i].match(/^\s+role\s*:\s*"([^"]+)"|^\s+role\s*:\s*(\S+)/)
        if (rm) role = rm[1] ?? rm[2]
        i++
      }
      if (file) entries.push({ file, role })
      continue
    }
    if (/^\s*$/.test(line)) {
      i++
      continue
    }
    break
  }
  return entries.length ? entries : null
}

export function resolveSpineFileUrl(rootUrl: string, rel: string): string {
  const trimmed = rel.trim()
  if (!trimmed || trimmed.includes('..') || trimmed.startsWith('/') || trimmed.includes('\\')) {
    throw new Error('MarkBreak spine path not allowed: ' + rel)
  }
  if (/^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(trimmed)) {
    throw new Error('MarkBreak spine path must be relative: ' + rel)
  }
  return new URL(trimmed, rootUrl.endsWith('/') ? rootUrl : rootUrl.replace(/[^/]*$/, '')).href
}

export async function expandSpineMarkdown(
  rootMarkdown: string,
  rootUrl: string,
  fetchText: (url: string) => Promise<string>
): Promise<{ markdown: string; expanded: boolean; files: number }> {
  const { yaml, body } = splitFrontMatter(rootMarkdown)
  if (!yaml) return { markdown: rootMarkdown, expanded: false, files: 0 }
  const entries = parseSpine(yaml)
  if (!entries) return { markdown: rootMarkdown, expanded: false, files: 0 }

  const parts: string[] = [rootMarkdown.trimEnd()]
  for (const entry of entries) {
    const url = resolveSpineFileUrl(rootUrl, entry.file)
    const child = await fetchText(url)
    const split = splitFrontMatter(child)
    const titleMatch = split.yaml?.match(/^title\s*:\s*"([^"]+)"|^title\s*:\s*(.+)$/m)
    const title = (titleMatch?.[1] ?? titleMatch?.[2]?.trim() ?? '').replace(/^["']|["']$/g, '')
    const childBody = split.body.trim()
    parts.push('')
    if (entry.role) {
      parts.push(`<!-- markbreak: ${entry.file} role=${entry.role} -->`)
    }
    if (childBody) {
      const first = childBody.split('\n').find((line) => line.trim()) ?? ''
      if (first.startsWith('#')) {
        parts.push(childBody)
      } else if (title) {
        parts.push(`# ${title}`, '', childBody)
      } else {
        parts.push(childBody)
      }
    }
  }

  return {
    markdown: parts.join('\n').replace(/\n{3,}/g, '\n\n') + '\n',
    expanded: true,
    files: entries.length
  }
}
