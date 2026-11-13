function parseDelimited (text: string, delim: string): string[][] {
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

function escapeHtml (s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

export function renderCsvHtml (text: string, delim: string, label: string): string {
  const rows = parseDelimited(text, delim)
  if (!rows.length) {
    return '<p class="mode-tag">' + label + '</p><p><em>Empty</em></p>'
  }
  const head = rows[0]
  const body = rows.slice(1)
  let html = '<p class="mode-tag">' + label + ' · ' + rows.length + ' rows</p><table><thead><tr>'
  head.forEach((cell) => {
    html += '<th>' + escapeHtml(cell) + '</th>'
  })
  html += '</tr></thead><tbody>'
  body.forEach((r) => {
    html += '<tr>'
    for (let c = 0; c < head.length; c++) {
      html += '<td>' + escapeHtml(r[c] ?? '') + '</td>'
    }
    html += '</tr>'
  })
  html += '</tbody></table>'
  return html
}
