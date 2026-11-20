import { describe, expect, it } from 'vitest'
import { breakKind, buildSpreadPairs, FLOW_BREAK_LINES, isFlowBreakLine } from './markbreakBreaks'

describe('online markbreakBreaks', () => {
  it('accepts only canonical //break lines and tight TeX forms', () => {
    expect(breakKind('//break')).toBe('column')
    expect(breakKind('  //break page  ')).toBe('page')
    expect(breakKind('//break odd')).toBe('odd')
    expect(breakKind('//break even')).toBe('even')
    expect(breakKind('\\newpage')).toBe('page')
    expect(breakKind('\\newpage{}')).toBe('page')
    expect(breakKind('\\pagebreak{}')).toBe('page')
    expect(breakKind('\\columnbreak')).toBe('column')
    expect(breakKind('\\cleardoublepage')).toBe('odd')
    expect(breakKind(FLOW_BREAK_LINES.page)).toBe('page')
  })

  it('rejects loose lookalikes', () => {
    expect(breakKind('---')).toBeNull()
    expect(breakKind('//break pages')).toBeNull()
    expect(breakKind('//breakpage')).toBeNull()
    expect(breakKind('// break')).toBeNull()
    expect(breakKind('prefix //break')).toBeNull()
    expect(breakKind('\\newpage}')).toBeNull()
    expect(breakKind('\\newpage{')).toBeNull()
    expect(breakKind('\\newpage{x}')).toBeNull()
    expect(isFlowBreakLine('===')).toBe(false)
  })

  it('builds verso/recto spreads with page 1 on the right', () => {
    expect(buildSpreadPairs(['p1', 'p2', 'p3', 'p4'])).toEqual([
      { verso: null, recto: 'p1' },
      { verso: 'p2', recto: 'p3' },
      { verso: 'p4', recto: null }
    ])
  })
})
