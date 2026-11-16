import { describe, expect, it } from 'vitest'
import { BOOK_PAGE_SIZES, getBookPageSize, pageAspectRatio } from 'common/bookPageSizes'
import { buildSpreadPairs } from 'common/markbreakBreaks'

describe('bookPageSizes', () => {
  it('includes trade and mass-market trims', () => {
    expect(getBookPageSize('Trade')?.widthMm).toBeCloseTo(152.4)
    expect(getBookPageSize('MassMarket')?.heightMm).toBeCloseTo(174.5)
    expect(BOOK_PAGE_SIZES.some((s) => s.id === 'A5')).toBe(true)
  })

  it('computes portrait and landscape aspect ratios', () => {
    const trade = getBookPageSize('Trade')!
    expect(pageAspectRatio(trade.widthMm, trade.heightMm, false)).toBeCloseTo(trade.widthMm / trade.heightMm)
    expect(pageAspectRatio(trade.widthMm, trade.heightMm, true)).toBeCloseTo(trade.heightMm / trade.widthMm)
  })

  it('pairs spreads with page 1 on the recto', () => {
    expect(buildSpreadPairs(['a', 'b', 'c'])).toEqual([
      { verso: null, recto: 'a' },
      { verso: 'b', recto: 'c' }
    ])
  })
})
