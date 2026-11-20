import { describe, expect, it } from 'vitest'
import { evaluateTable, stripHiddenColumns } from './markbreakCalc'

describe('markbreakCalc §8', () => {
  it('evaluates the fixture first table (hidden Factor column)', () => {
    const table = evaluateTable([
      ['Item', 'Qty', 'Pack price', 'Factor (hidden)', 'Line total'],
      ['Apples', '2', '3', '10', '=C2*C3*C4'],
      ['Pears', '4', '5', '2', '=@Qty*@{Pack price}*@Factor'],
      ['Total', '=SUM(C2R1:C2R2)', '=AVERAGE(C3R1:C3R2)', '', '=SUM(C5R1:C5R2)']
    ])
    expect(table).not.toBeNull()
    const visible = stripHiddenColumns(table!)
    expect(visible.headers.map((c) => c.text)).toEqual([
      'Item',
      'Qty',
      'Pack price',
      'Line total'
    ])
    expect(visible.body.map((r) => r.map((c) => c.text))).toEqual([
      ['Apples', '2', '3', '60'],
      ['Pears', '4', '5', '40'],
      ['Total', '6', '4', '100']
    ])
    expect(visible.body[0][3].calc).toBe('=C2*C3*C4')
  })

  it('covers aggregates, literals, escapes and errors', () => {
    const table = evaluateTable([
      ['Measure', 'Amount'],
      ['Alpha', '2'],
      ['Beta', '4'],
      ['Gamma', '6'],
      ['Smallest', '=MIN(C2R1:C2R3)'],
      ['Largest', '=MAX(C2R1:C2R3)'],
      ['Counted', '=COUNT(C2R1:C2R3)'],
      ['Product', '=PRODUCT(C2R1:C2R3)'],
      ['Specific', '=C2R2*180'],
      ['Percent', '=C2R1*50%'],
      ['Literal', 'C2R2*180'],
      ['Escaped', "'=C2R2"],
      ['Broken', '=C2R1/0'],
      ['Missing', '=C9R9']
    ])!
    const byName = Object.fromEntries(table.body.map((r) => [r[0].text, r[1].text]))
    expect(byName).toMatchObject({
      Smallest: '2',
      Largest: '6',
      Counted: '3',
      Product: '48',
      Specific: '720',
      Percent: '1',
      Literal: 'C2R2*180',
      Escaped: '=C2R2',
      Broken: '#DIV/0!',
      Missing: '#REF!'
    })
  })

  it('resolves named rows and columns', () => {
    const table = evaluateTable([
      ['Item', 'Qty', 'Price'],
      ['Apples', '2', '3'],
      ['Pears', '4', '5'],
      ['Cherry picking', '=@Qty@Pears', ''],
      ['Copied', '=@Qty@{Cherry picking}', ''],
      ['Named cell', '=@Qty@Apples*@Price@Apples', ''],
      ['By number', '=C3@Pears', ''],
      ['Row sum', '=SUM(@Pears)', ''],
      ['Row range', '=SUM(@Apples:@Pears)', '']
    ])!
    const byName = Object.fromEntries(table.body.map((r) => [r[0].text, r[1].text]))
    expect(byName).toMatchObject({
      'Cherry picking': '4',
      Copied: '4',
      'Named cell': '6',
      'By number': '5',
      'Row sum': '9',
      'Row range': '14'
    })
  })

  it('detects cycles', () => {
    const table = evaluateTable([
      ['Left', 'Right'],
      ['=C2R1', '=C1R1']
    ])!
    expect(table.body[0].map((c) => c.text)).toEqual(['#CYCLE!', '#CYCLE!'])
  })

  it('returns null when the table has no formulas or hidden columns', () => {
    expect(
      evaluateTable([
        ['A', 'B'],
        ['1', '2']
      ])
    ).toBeNull()
  })
})
