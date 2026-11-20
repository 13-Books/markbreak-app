import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { breakKind, buildSpreadPairs, FLOW_BREAK_LINES, isFlowBreakLine } from './markbreakBreaks.ts'

describe('online markbreakBreaks', () => {
  it('accepts only canonical //break lines and tight TeX forms', () => {
    assert.equal(breakKind('//break'), 'column')
    assert.equal(breakKind('  //break page  '), 'page')
    assert.equal(breakKind('//break odd'), 'odd')
    assert.equal(breakKind('//break even'), 'even')
    assert.equal(breakKind('\\newpage'), 'page')
    assert.equal(breakKind('\\newpage{}'), 'page')
    assert.equal(breakKind('\\pagebreak{}'), 'page')
    assert.equal(breakKind('\\columnbreak'), 'column')
    assert.equal(breakKind('\\cleardoublepage'), 'odd')
    assert.equal(breakKind(FLOW_BREAK_LINES.page), 'page')
  })

  it('rejects loose lookalikes', () => {
    assert.equal(breakKind('---'), null)
    assert.equal(breakKind('//break pages'), null)
    assert.equal(breakKind('//breakpage'), null)
    assert.equal(breakKind('// break'), null)
    assert.equal(breakKind('prefix //break'), null)
    assert.equal(breakKind('\\newpage}'), null)
    assert.equal(breakKind('\\newpage{'), null)
    assert.equal(breakKind('\\newpage{x}'), null)
    assert.equal(isFlowBreakLine('==='), false)
  })

  it('builds verso/recto spreads with page 1 on the right', () => {
    assert.deepEqual(buildSpreadPairs(['p1', 'p2', 'p3', 'p4']), [
      { verso: null, recto: 'p1' },
      { verso: 'p2', recto: 'p3' },
      { verso: 'p4', recto: null }
    ])
  })
})
