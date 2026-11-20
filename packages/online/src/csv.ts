import { evaluateTable, stripHiddenColumns, type CalcCell } from './markbreakCalc'

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

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function cellHtml(cell: CalcCell, tag: 'th' | 'td'): string {
  const attrs = cell.calc
    ? ` data-calc="${escapeHtml(cell.calc)}" title="${escapeHtml(cell.calc)}" class="mb-calc"`
    : ''
  return `<${tag}${attrs}>${escapeHtml(cell.text)}</${tag}>`
}

export function renderCsvHtml(text: string, delim: string, label: string): string {
  const rows = parseDelimited(text, delim)
  if (!rows.length) {
    return '<p class="mode-tag">' + label + '</p><p><em>Empty</em></p>'
  }

  const evaluated = evaluateTable(rows)
  const table = evaluated ? stripHiddenColumns(evaluated) : null
  const head = table?.headers.map((c) => c.text) ?? rows[0]
  const bodyCells: CalcCell[][] =
    table?.body ??
    rows.slice(1).map((r) =>
      head.map((_, c) => ({ text: r[c] ?? '' }))
    )
  // When there are no formulas, still render plain cells from the raw grid.
  const headCells: CalcCell[] = table?.headers ?? head.map((text) => ({ text }))

  let html =
    '<p class="mode-tag">' +
    label +
    ' · ' +
    (bodyCells.length + 1) +
    ' rows</p><table><thead><tr>'
  for (const cell of headCells) html += cellHtml(cell, 'th')
  html += '</tr></thead><tbody>'
  for (const r of bodyCells) {
    html += '<tr>'
    for (let c = 0; c < headCells.length; c++) html += cellHtml(r[c] ?? { text: '' }, 'td')
    html += '</tr>'
  }
  html += '</tbody></table>'
  return html
}
