/** Turn a CSV/TSV string into a Markdown pipe table (formulas left intact). */

function parseDelimited(text: string, delim: string): string[][] {
  const rows: string[][] = []
  let row: string[] = []
  let field = ''
  let i = 0
  let inQuotes = false
  const s = text.replace(/^\uFEFF/, '')
  while (i < s.length) {
    const c = s[i]
    if (inQuotes) {
      if (c === '"') {
        if (s[i + 1] === '"') {
          field += '"'
          i += 2
          continue
        }
        inQuotes = false
        i++
        continue
      }
      field += c
      i++
      continue
    }
    if (c === '"') {
      inQuotes = true
      i++
      continue
    }
    if (c === delim) {
      row.push(field)
      field = ''
      i++
      continue
    }
    if (c === '\n' || (c === '\r' && s[i + 1] === '\n')) {
      row.push(field)
      rows.push(row)
      row = []
      field = ''
      i += c === '\r' ? 2 : 1
      continue
    }
    if (c === '\r') {
      row.push(field)
      rows.push(row)
      row = []
      field = ''
      i++
      continue
    }
    field += c
    i++
  }
  if (field.length || row.length) {
    row.push(field)
    rows.push(row)
  }
  return rows.filter((r) => r.some((cell) => cell.length > 0))
}

const escapeCell = (s: string): string => s.replace(/\|/g, '\\|').replace(/\n/g, ' ')

export function csvToMarkdownTable(text: string, delim = ','): string {
  const rows = parseDelimited(text, delim)
  if (!rows.length) return ''
  const width = Math.max(...rows.map((r) => r.length))
  const pad = (r: string[]): string[] => {
    const out = r.slice()
    while (out.length < width) out.push('')
    return out
  }
  const lines: string[] = []
  const head = pad(rows[0]).map(escapeCell)
  lines.push(`| ${head.join(' | ')} |`)
  lines.push(`| ${head.map(() => '---').join(' | ')} |`)
  for (const r of rows.slice(1)) {
    lines.push(`| ${pad(r).map(escapeCell).join(' | ')} |`)
  }
  return lines.join('\n')
}

export function isCsvSpinePath(file: string): boolean {
  return /\.csv$/i.test(file.trim())
}
