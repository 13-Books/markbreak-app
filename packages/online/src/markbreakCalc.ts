/**
 * MarkBreak §8 table calculations for the online preview.
 * Dialect-aligned with tools/markbreak.lua — same CR refs, @names, and errors.
 */

export type CalcCell = {
  /** Visible text after evaluation (or the literal). */
  text: string
  /** Original formula including leading `=`, when this cell was a calculation. */
  calc?: string
}

export type CalcTable = {
  headers: CalcCell[]
  body: CalcCell[][]
  /** 1-based column indexes that are hidden helpers. */
  hiddenColumns: number[]
}

type CellRec = {
  row: number
  col: number
  text: string
  formula: string | null
  source: string | null
  escaped: boolean
  escapeLen: number
  state: 0 | 1 | 2
  value: number | null
  err: string | null
  display: string | null
}

type Token =
  | { kind: 'number'; value: number }
  | { kind: 'op'; value: string }
  | { kind: 'ident'; name: string }
  | { kind: 'header'; name: string; row?: number }
  | { kind: 'column'; col: number }
  | { kind: 'cell'; col: number; row: number }

type Node =
  | { kind: 'scalar'; value: number }
  | { kind: 'column'; col: number }
  | { kind: 'cell'; col: number; row: number }
  | { kind: 'row'; row: number }
  | { kind: 'values'; values: number[] }

const CALC_FUNCTIONS = new Set(['SUM', 'AVERAGE', 'AVG', 'MIN', 'MAX', 'COUNT', 'PRODUCT'])
const ERROR_RE = /#[A-Z0-9/!?]+/

const trim = (s: string): string => s.replace(/^\s+/, '').replace(/\s+$/, '')

const squeezeKey = (s: string): string => trim(s).toLowerCase().replace(/\s+/g, ' ')

const parseNumber = (text: string | null | undefined): number | null => {
  if (text == null) return null
  let t = trim(text)
  if (!t) return null
  let negative = false
  if (/^\(.*\)$/.test(t)) {
    negative = true
    t = trim(t.slice(1, -1))
  }
  t = t.replace(/^[$£€]\s*/, '')
  let percent = false
  if (/%\s*$/.test(t)) {
    percent = true
    t = trim(t.replace(/%\s*$/, ''))
  }
  t = t.replace(/,/g, '')
  if (!/^[+-]?\d+\.?\d*$/.test(t) && !/^[+-]?\.\d+$/.test(t) && !/^[+-]?\d+\.?\d*[eE][+-]?\d+$/.test(t)) {
    return null
  }
  const n = Number(t)
  if (!Number.isFinite(n)) return null
  let out = percent ? n / 100 : n
  if (negative) out = -out
  return out
}

const formatNumber = (value: number): string => {
  if (!Number.isFinite(value)) throw new Error('#NUM!')
  if (Math.abs(value - Math.round(value)) < 1e-12 && Math.abs(value) < 1e15) {
    return String(Math.round(value))
  }
  // Match Lua's %.10g spirit: trim trailing zeros from a precise render.
  const fixed = value.toPrecision(10)
  return String(Number(fixed))
}

const tokenize = (formula: string): Token[] => {
  const tokens: Token[] = []
  let i = 0
  while (i < formula.length) {
    const ch = formula[i]
    if (/\s/.test(ch)) {
      i++
      continue
    }
    if (ch === '@') {
      if (formula[i + 1] === '{') {
        const close = formula.indexOf('}', i + 2)
        if (close < 0) throw new Error('#VALUE!')
        const name = formula.slice(i + 2, close)
        const suffix = formula.slice(close + 1)
        const rowMatch = suffix.match(/^[Rr](\d+)/)
        if (rowMatch) {
          tokens.push({ kind: 'header', name, row: Number(rowMatch[1]) })
          i = close + 1 + rowMatch[0].length
        } else {
          tokens.push({ kind: 'header', name })
          i = close + 1
        }
      } else {
        const word = formula.slice(i).match(/^@([\w.\-]+)/)
        if (!word) throw new Error('#VALUE!')
        tokens.push({ kind: 'header', name: word[1] })
        i += word[0].length
      }
      continue
    }
    if (/\d/.test(ch) || (ch === '.' && /\d/.test(formula[i + 1] ?? ''))) {
      const rest = formula.slice(i)
      const num =
        rest.match(/^\d+\.?\d*[eE][+-]?\d+/)?.[0] ??
        rest.match(/^\d+\.?\d*/)?.[0] ??
        rest.match(/^\.\d+/)?.[0]
      if (!num) throw new Error('#VALUE!')
      tokens.push({ kind: 'number', value: Number(num) })
      i += num.length
      continue
    }
    if (/[a-zA-Z_]/.test(ch)) {
      const rest = formula.slice(i)
      const cr = rest.match(/^[Cc](\d+)[Rr](\d+)/)
      if (cr) {
        tokens.push({ kind: 'cell', col: Number(cr[1]), row: Number(cr[2]) })
        i += cr[0].length
        continue
      }
      const colOnly = rest.match(/^[Cc](\d+)/)
      if (colOnly && !/^[Cc]\d+[a-zA-Z_]/.test(rest)) {
        tokens.push({ kind: 'column', col: Number(colOnly[1]) })
        i += colOnly[0].length
        continue
      }
      const rc = rest.match(/^[Rr](\d+)[Cc](\d+)/)
      if (rc) {
        tokens.push({ kind: 'cell', col: Number(rc[2]), row: Number(rc[1]) })
        i += rc[0].length
        continue
      }
      const word = rest.match(/^[A-Za-z_][A-Za-z0-9_.\-]*/)?.[0]
      if (!word) throw new Error('#VALUE!')
      tokens.push({ kind: 'ident', name: word })
      i += word.length
      continue
    }
    if ('+-*/^%(),:'.includes(ch)) {
      tokens.push({ kind: 'op', value: ch })
      i++
      continue
    }
    throw new Error('#VALUE!')
  }
  return tokens
}

const catchError = (err: unknown): string => {
  if (typeof err === 'string' && ERROR_RE.test(err)) {
    return err.match(ERROR_RE)![0]
  }
  if (err instanceof Error && ERROR_RE.test(err.message)) {
    return err.message.match(ERROR_RE)![0]
  }
  return '#VALUE!'
}

/**
 * Evaluate a Markdown/CSV table grid. `rows[0]` is the header row.
 * Returns display cells with formulas resolved and hidden columns flagged.
 */
export function evaluateTable(rows: string[][]): CalcTable | null {
  if (!rows.length) return null
  const headerTexts = rows[0] ?? []
  const bodyRows = rows.slice(1)
  if (!headerTexts.length && !bodyRows.length) return null

  const headerCol = new Map<string, number>()
  const hiddenCol = new Set<number>()
  const headers: CalcCell[] = []

  for (let c = 0; c < headerTexts.length; c++) {
    let name = trim(headerTexts[c] ?? '')
    const visual = c + 1
    if (/\(hidden\)\s*$/i.test(name)) {
      hiddenCol.add(visual)
      name = trim(name.replace(/\s*\(hidden\)\s*$/i, ''))
    }
    const key = squeezeKey(name)
    if (key && !headerCol.has(key)) headerCol.set(key, visual)
    headers.push({ text: headerTexts[c] ?? '' })
  }

  const colCount = Math.max(
    headers.length,
    ...bodyRows.map((r) => r.length),
    0
  )
  while (headers.length < colCount) headers.push({ text: '' })

  const grid = new Map<string, CellRec>()
  const records: CellRec[] = []
  const rowByLabel = new Map<string, number>()
  const bodyRowIndexes: number[] = []

  const register = (rowIndex: number, cells: string[]): void => {
    for (let c = 0; c < colCount; c++) {
      const text = trim(cells[c] ?? '')
      const rec: CellRec = {
        row: rowIndex,
        col: c + 1,
        text,
        formula: null,
        source: null,
        escaped: false,
        escapeLen: 0,
        state: 0,
        value: null,
        err: null,
        display: null
      }
      if (text.startsWith("'=")) {
        rec.escaped = true
        rec.escapeLen = 1
      } else if (text.startsWith('\u2019=')) {
        rec.escaped = true
        rec.escapeLen = 1
      } else if (text.startsWith('=')) {
        rec.formula = trim(text.slice(1))
        rec.source = text
      }
      grid.set(`${rowIndex},${c + 1}`, rec)
      records.push(rec)
      if (rowIndex >= 1 && c === 0 && !rec.formula) {
        const key = squeezeKey(text)
        if (key && !rowByLabel.has(key)) rowByLabel.set(key, rowIndex)
      }
    }
  }

  for (let r = 0; r < bodyRows.length; r++) {
    const rowIndex = r + 1
    register(rowIndex, bodyRows[r] ?? [])
    bodyRowIndexes.push(rowIndex)
  }

  const anyCalc = records.some((rec) => rec.formula || rec.escaped)
  if (!anyCalc && hiddenCol.size === 0) return null

  const lookup = (row: number, col: number): CellRec => {
    const rec = grid.get(`${row},${col}`)
    if (!rec) throw new Error('#REF!')
    return rec
  }

  const cellNumber = (rec: CellRec, inRange: boolean): number | null => {
    if (rec.formula) return evalCell(rec)
    const n = parseNumber(rec.text)
    if (n != null) return n
    if (inRange) return null
    if (trim(rec.text) === '') return 0
    throw new Error('#VALUE!')
  }

  const evalCell = (rec: CellRec): number => {
    if (rec.state === 2) {
      if (rec.err) throw new Error(rec.err)
      return rec.value as number
    }
    if (rec.state === 1) throw new Error('#CYCLE!')
    rec.state = 1
    try {
      if (!rec.formula) throw new Error('#VALUE!')
      const tokens = tokenize(rec.formula)
      let pos = 0
      const peek = (): Token | undefined => tokens[pos]
      const take = (): Token | undefined => tokens[pos++]
      const expectOp = (value: string): void => {
        const token = take()
        if (!token || token.kind !== 'op' || token.value !== value) throw new Error('#VALUE!')
      }

      const asScalar = (node: Node): number => {
        if (node.kind === 'scalar') return node.value
        if (node.kind === 'values') throw new Error('#VALUE!')
        if (node.kind === 'column') return cellNumber(lookup(rec.row, node.col), false) as number
        if (node.kind === 'cell') return cellNumber(lookup(node.row, node.col), false) as number
        if (node.kind === 'row') throw new Error('#VALUE!')
        throw new Error('#VALUE!')
      }

      const collect = (node: Node, out: number[]): void => {
        if (node.kind === 'values') {
          out.push(...node.values)
          return
        }
        if (node.kind === 'column') {
          for (const rowIndex of bodyRowIndexes) {
            const target = grid.get(`${rowIndex},${node.col}`)
            if (!target) continue
            const n = cellNumber(target, true)
            if (n != null) out.push(n)
          }
          return
        }
        if (node.kind === 'row') {
          for (let col = 1; col <= colCount; col++) {
            const target = grid.get(`${node.row},${col}`)
            if (!target) continue
            const n = cellNumber(target, true)
            if (n != null) out.push(n)
          }
          return
        }
        out.push(asScalar(node))
      }

      const applyFunction = (name: string, args: Node[]): number => {
        const values: number[] = []
        for (const arg of args) collect(arg, values)
        if (name === 'COUNT') return values.length
        if (name === 'SUM' || name === 'PRODUCT') {
          if (name === 'PRODUCT' && values.length === 0) return 0
          let acc = name === 'SUM' ? 0 : 1
          for (const value of values) acc = name === 'SUM' ? acc + value : acc * value
          return acc
        }
        if (values.length === 0) {
          if (name === 'AVERAGE' || name === 'AVG') throw new Error('#DIV/0!')
          return 0
        }
        let acc = values[0]
        for (let i = 1; i < values.length; i++) {
          const v = values[i]
          if (name === 'AVERAGE' || name === 'AVG') acc += v
          else if (name === 'MIN') acc = Math.min(acc, v)
          else if (name === 'MAX') acc = Math.max(acc, v)
        }
        if (name === 'AVERAGE' || name === 'AVG') return acc / values.length
        return acc
      }

      const refNode = (token: Token): Node => {
        if (token.kind === 'column') return { kind: 'column', col: token.col }
        if (token.kind === 'cell') return { kind: 'cell', col: token.col, row: token.row }
        if (token.kind === 'header') {
          let key = squeezeKey(token.name)
          let row = token.row
          let col = headerCol.get(key)
          if (col == null && row == null) {
            const m = key.match(/^(.*)r(\d+)$/)
            if (m && headerCol.has(m[1])) {
              col = headerCol.get(m[1])
              row = Number(m[2])
              key = m[1]
            }
          }
          if (col == null) {
            const namedRow = row == null ? rowByLabel.get(key) : undefined
            if (namedRow != null) return { kind: 'row', row: namedRow }
            throw new Error('#REF!')
          }
          if (row != null) return { kind: 'cell', col, row }
          return { kind: 'column', col }
        }
        if (token.kind === 'ident') {
          const key = squeezeKey(token.name)
          const col = headerCol.get(key)
          if (col != null) return { kind: 'column', col }
          const namedRow = rowByLabel.get(key)
          if (namedRow != null) return { kind: 'row', row: namedRow }
          throw new Error('#NAME?')
        }
        throw new Error('#VALUE!')
      }

      const rowFromName = (name: string): number => {
        const row = rowByLabel.get(squeezeKey(name))
        if (row == null) throw new Error('#REF!')
        return row
      }

      const nodeFrom = (token: Token): Node => {
        const node = refNode(token)
        const following = peek()
        if (following && following.kind === 'header') {
          if (node.kind !== 'column' || following.row != null) throw new Error('#VALUE!')
          take()
          return { kind: 'cell', col: node.col, row: rowFromName(following.name) }
        }
        return node
      }

      const parseExpr = (): Node => {
        let left = parseTerm()
        for (;;) {
          const token = peek()
          if (!token || token.kind !== 'op' || (token.value !== '+' && token.value !== '-')) return left
          take()
          const right = asScalar(parseTerm())
          const value = token.value === '+' ? asScalar(left) + right : asScalar(left) - right
          left = { kind: 'scalar', value }
        }
      }

      const parseTerm = (): Node => {
        let left = parseFactor()
        for (;;) {
          const token = peek()
          if (!token || token.kind !== 'op' || (token.value !== '*' && token.value !== '/')) return left
          take()
          const right = asScalar(parseFactor())
          const value = asScalar(left)
          if (token.value === '/') {
            if (right === 0) throw new Error('#DIV/0!')
            left = { kind: 'scalar', value: value / right }
          } else {
            left = { kind: 'scalar', value: value * right }
          }
        }
      }

      const parseFactor = (): Node => {
        const token = peek()
        if (token && token.kind === 'op' && token.value === '-') {
          take()
          return { kind: 'scalar', value: -asScalar(parseFactor()) }
        }
        if (token && token.kind === 'op' && token.value === '+') {
          take()
          return parseFactor()
        }
        const base = parsePrimary()
        const after = peek()
        if (after && after.kind === 'op' && after.value === '%') {
          take()
          return { kind: 'scalar', value: asScalar(base) / 100 }
        }
        if (after && after.kind === 'op' && after.value === '^') {
          take()
          return { kind: 'scalar', value: asScalar(base) ** asScalar(parseFactor()) }
        }
        return base
      }

      const parsePrimary = (): Node => {
        const token = take()
        if (!token) throw new Error('#VALUE!')
        if (token.kind === 'number') return { kind: 'scalar', value: token.value }
        if (token.kind === 'op' && token.value === '(') {
          const inner = parseExpr()
          expectOp(')')
          return inner
        }
        if (token.kind === 'ident' && CALC_FUNCTIONS.has(token.name.toUpperCase())) {
          const name = token.name.toUpperCase()
          expectOp('(')
          const args: Node[] = []
          const closing = peek()
          if (closing && closing.kind === 'op' && closing.value === ')') {
            take()
          } else {
            for (;;) {
              args.push(parseExpr())
              const sep = take()
              if (sep && sep.kind === 'op' && sep.value === ')') break
              if (!sep || sep.kind !== 'op' || sep.value !== ',') throw new Error('#VALUE!')
            }
          }
          return { kind: 'scalar', value: applyFunction(name, args) }
        }
        if (
          token.kind === 'ident' ||
          token.kind === 'header' ||
          token.kind === 'cell' ||
          token.kind === 'column'
        ) {
          const node = nodeFrom(token)
          const following = peek()
          if (following && following.kind === 'op' && following.value === ':') {
            take()
            const otherToken = take()
            if (!otherToken) throw new Error('#REF!')
            const other = nodeFrom(otherToken)
            const values: number[] = []
            if (node.kind === 'cell' && other.kind === 'cell') {
              for (let r = Math.min(node.row, other.row); r <= Math.max(node.row, other.row); r++) {
                for (let c = Math.min(node.col, other.col); c <= Math.max(node.col, other.col); c++) {
                  const target = grid.get(`${r},${c}`)
                  if (!target) continue
                  const n = cellNumber(target, true)
                  if (n != null) values.push(n)
                }
              }
            } else if (node.kind === 'row' && other.kind === 'row') {
              for (let r = Math.min(node.row, other.row); r <= Math.max(node.row, other.row); r++) {
                for (let c = 1; c <= colCount; c++) {
                  const target = grid.get(`${r},${c}`)
                  if (!target) continue
                  const n = cellNumber(target, true)
                  if (n != null) values.push(n)
                }
              }
            } else {
              throw new Error('#REF!')
            }
            return { kind: 'values', values }
          }
          return node
        }
        throw new Error('#VALUE!')
      }

      const node = parseExpr()
      if (pos < tokens.length) throw new Error('#VALUE!')
      const result = asScalar(node)
      rec.state = 2
      rec.value = result
      return result
    } catch (err) {
      rec.state = 2
      rec.err = catchError(err)
      throw new Error(rec.err)
    }
  }

  for (const rec of records) {
    if (rec.escaped) {
      // Drop the leading apostrophe (or smart quote); keep the `=`.
      rec.display = rec.text.slice(rec.escapeLen)
    } else if (rec.formula) {
      try {
        const result = evalCell(rec)
        try {
          rec.display = formatNumber(result)
        } catch {
          rec.display = '#NUM!'
        }
      } catch (err) {
        rec.display = catchError(err)
      }
    } else {
      rec.display = rec.text
    }
  }

  const outHeaders: CalcCell[] = headers.map((h, i) => {
    const visual = i + 1
    let text = h.text
    if (hiddenCol.has(visual)) text = trim(text.replace(/\s*\(hidden\)\s*$/i, ''))
    return { text }
  })

  const body: CalcCell[][] = bodyRowIndexes.map((rowIndex) => {
    const row: CalcCell[] = []
    for (let c = 1; c <= colCount; c++) {
      const rec = grid.get(`${rowIndex},${c}`)!
      row.push({
        text: rec.display ?? rec.text,
        calc: rec.source ?? undefined
      })
    }
    return row
  })

  return {
    headers: outHeaders,
    body,
    hiddenColumns: [...hiddenCol].sort((a, b) => a - b)
  }
}

/** Drop hidden helper columns from an evaluated table (export / reader view). */
export function stripHiddenColumns(table: CalcTable): CalcTable {
  if (!table.hiddenColumns.length) return table
  const hide = new Set(table.hiddenColumns)
  const keep = (cells: CalcCell[]): CalcCell[] =>
    cells.filter((_, i) => !hide.has(i + 1))
  return {
    headers: keep(table.headers),
    body: table.body.map(keep),
    hiddenColumns: []
  }
}

/**
 * Walk HTML tables under `root`, evaluate MarkBreak formulas in place,
 * stamp `data-calc`, and remove hidden helper columns.
 */
export function applyCalculationsToTables(root: ParentNode): void {
  for (const table of Array.from(root.querySelectorAll('table'))) {
    const rowEls = Array.from(
      table.querySelectorAll(':scope > tr, :scope > thead > tr, :scope > tbody > tr')
    )
    if (!rowEls.length) continue
    const grid: string[][] = rowEls.map((row) =>
      Array.from(row.children)
        .filter((el) => el.tagName === 'TH' || el.tagName === 'TD')
        .map((el) => trim(el.textContent ?? ''))
    )
    const evaluated = evaluateTable(grid)
    if (!evaluated) continue
    const visible = stripHiddenColumns(evaluated)
    const hide = new Set(evaluated.hiddenColumns)

    rowEls.forEach((rowEl, r) => {
      const cells = Array.from(rowEl.children).filter(
        (el) => el.tagName === 'TH' || el.tagName === 'TD'
      ) as HTMLElement[]
      const sourceRow = r === 0 ? visible.headers : visible.body[r - 1]
      let visibleIndex = 0
      for (let c = 0; c < cells.length; c++) {
        if (hide.has(c + 1)) {
          cells[c].remove()
          continue
        }
        const src = sourceRow?.[visibleIndex]
        visibleIndex++
        if (!src) continue
        const cell = cells[c]
        if (src.calc) {
          cell.dataset.calc = src.calc
          cell.title = src.calc
          cell.textContent = src.text
          cell.classList.add('mb-calc')
        } else if (src.text !== trim(grid[r]?.[c] ?? '')) {
          cell.textContent = src.text
        }
      }
    })
  }
}
