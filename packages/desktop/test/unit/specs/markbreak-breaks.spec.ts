import { describe, expect, it } from 'vitest'
import {
  breakKind,
  buildSpreadPairs,
  expandNpToken,
  FLOW_BREAK_LINES,
  flowBreakInsertSnippet,
  isFlowBreakLine,
  joinFolioPages,
  migrateAuthorBreaks,
  splitFolioPages
} from 'common/markbreakBreaks'

describe('markbreakBreaks', () => {
  it('classifies filter-aligned break lines', () => {
    expect(breakKind('//break')).toBe('column')
    expect(breakKind('  //break page  ')).toBe('page')
    expect(breakKind('//break odd')).toBe('odd')
    expect(breakKind('//break even')).toBe('even')
    expect(breakKind('\\newpage')).toBe('page')
    expect(breakKind('\\newpage{}')).toBe('page')
    expect(breakKind('\\pagebreak')).toBe('page')
    expect(breakKind('\\columnbreak')).toBe('column')
    expect(breakKind('\\cleardoublepage')).toBe('odd')
    expect(breakKind('---')).toBeNull()
    expect(breakKind('# Chapter')).toBeNull()
    // Loose / partial forms must not match.
    expect(breakKind('//break pages')).toBeNull()
    expect(breakKind('//breakpage')).toBeNull()
    expect(breakKind('// break')).toBeNull()
    expect(breakKind('say //break')).toBeNull()
    expect(breakKind('\\newpage}')).toBeNull()
    expect(breakKind('\\newpage{')).toBeNull()
    expect(breakKind('\\newpage{ }')).toBeNull()
    expect(breakKind('\\newpage{x}')).toBeNull()
  })

  it('migrates legacy TeX page markers', () => {
    expect(migrateAuthorBreaks('a\n\\newpage\nb\n\\pagebreak{}\nc')).toBe(
      `a\n${FLOW_BREAK_LINES.page}\nb\n${FLOW_BREAK_LINES.page}\nc`
    )
  })

  it('splits and joins folio pages on flow breaks only', () => {
    const md = [
      '---',
      'role: chapter',
      '---',
      '',
      'One',
      '',
      '//break',
      '',
      'Two',
      '',
      '---',
      '',
      'still two',
      '',
      '//break page',
      '',
      'Three'
    ].join('\n')
    const pages = splitFolioPages(md)
    expect(pages).toHaveLength(3)
    expect(pages[0]).toContain('role: chapter')
    expect(pages[0]).toContain('One')
    expect(pages[1]).toContain('still two')
    expect(pages[1]).toContain('---')
    expect(pages[2]).toBe('Three')
    expect(isFlowBreakLine('---')).toBe(false)
    const joined = joinFolioPages(['A', 'B'])
    expect(joined).toBe(`A\n\n${FLOW_BREAK_LINES.column}\n\nB`)
  })

  it('builds verso/recto spreads with page 1 on the right', () => {
    expect(buildSpreadPairs(['p1', 'p2', 'p3', 'p4'])).toEqual([
      { verso: null, recto: 'p1' },
      { verso: 'p2', recto: 'p3' },
      { verso: 'p4', recto: null }
    ])
  })

  it('expands /np before Space or Enter', () => {
    expect(expandNpToken('hello /np', ' ')).toEqual({
      replaceFrom: 6,
      insert: `${FLOW_BREAK_LINES.column}\n\n`
    })
    expect(expandNpToken('/np', '\n')?.replaceFrom).toBe(0)
    expect(expandNpToken('nope', ' ')).toBeNull()
  })

  it('formats an insert snippet with surrounding blank lines', () => {
    expect(flowBreakInsertSnippet('page')).toBe(`\n\n${FLOW_BREAK_LINES.page}\n\n`)
  })
})
