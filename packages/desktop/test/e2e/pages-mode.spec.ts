import { expect, test } from '@playwright/test'
import type { ElectronApplication, Page } from 'playwright'
import { launchWithMarkdown, sendIpcToRenderer } from './helpers'

// Pages/Spreads must show Muya's own rendering, cut into pages, with nothing
// clipped, duplicated or left as raw markdown.

const token = (i: number): string => `tok${String(i).padStart(3, '0')}`
const prose = (from: number, count: number): string =>
  Array.from({ length: count }, (_, i) => {
    const t = token(from + i)
    return i % 9 === 0 ? `**${t}**` : i % 7 === 0 ? `*${t}*` : t
  }).join(' ')

let next = 0
const take = (count: number): string => {
  const text = prose(next, count)
  next += count
  return text
}
const tableRows = Array.from({ length: 30 }, () => `| ${take(1)} | ${take(1)} |`).join('\n')
const MARKDOWN = [
  '# Chapter One',
  take(220),
  '## A table',
  ['| Left | Right |', '|---|---|', tableRows].join('\n'),
  Array.from({ length: 12 }, () => `1. ${take(6)}`).join('\n'),
  `> ${take(80)}`,
  '//break',
  '## After the break',
  take(400)
].join('\n\n')
const TOKENS = Array.from({ length: next }, (_, i) => token(i))

const enterMode = async(app: ElectronApplication, page: Page, mode: 'pages' | 'spreads'): Promise<void> => {
  await sendIpcToRenderer(app, 'mt::toggle-document-view-mode', mode)
  await page.waitForFunction(
    (selector) => document.querySelectorAll(`${selector} .page-card .mu-container > *`).length > 0,
    mode === 'spreads' ? '.pages-view.spreads' : '.pages-view:not(.spreads)',
    { timeout: 15000 }
  )
  await page.waitForTimeout(400)
}

const inspect = (page: Page) =>
  page.evaluate(() => {
    const bodies = Array.from(document.querySelectorAll<HTMLElement>('.page-card .page-body > .mu-container'))
    const clipped = bodies
      .map((body, index) => ({ index, over: body.scrollHeight - body.clientHeight }))
      .filter(({ over }) => over > 0)
    // Only text that paints: Muya keeps markdown markers in the DOM at
    // font-size 0, and innerText would still report them.
    const painted = (node: Text): boolean => {
      const style = getComputedStyle(node.parentElement!)
      if (parseFloat(style.fontSize) === 0 || style.visibility === 'hidden') return false
      if (style.color === 'transparent' || style.color === 'rgba(0, 0, 0, 0)') return false
      const range = document.createRange()
      range.selectNodeContents(node)
      return Array.from(range.getClientRects()).some((rect) => rect.width > 0 && rect.height > 0)
    }
    const pieces: string[] = []
    for (const body of bodies) {
      const walker = document.createTreeWalker(body, NodeFilter.SHOW_TEXT)
      for (let node = walker.nextNode() as Text | null; node; node = walker.nextNode() as Text | null) {
        if (node.data.trim() && painted(node)) pieces.push(node.data)
      }
      pieces.push('\n')
    }
    const text = pieces.join(' ')
    return {
      pageCount: bodies.length,
      clipped,
      tables: document.querySelectorAll('.page-card table').length,
      orderedLists: document.querySelectorAll('.page-card ol').length,
      text
    }
  })

test.describe('Pages and Spreads render through Muya', () => {
  let app: ElectronApplication
  let page: Page

  test.beforeAll(async() => {
    ({ app, page } = await launchWithMarkdown(MARKDOWN))
  })
  test.afterAll(async() => {
    await app?.close()
  })

  for (const mode of ['pages', 'spreads'] as const) {
    test(`${mode}: every word once, nothing clipped, no raw markdown`, async() => {
      await enterMode(app, page, mode)
      const result = await inspect(page)
      expect(result.pageCount).toBeGreaterThan(3)
      expect(result.clipped).toEqual([])
      expect(result.tables).toBeGreaterThan(1)
      expect(result.orderedLists).toBeGreaterThan(0)
      for (const t of TOKENS) {
        expect(result.text.split(t).length - 1, `${t} occurrences`).toBe(1)
      }
      expect(result.text).not.toMatch(/\|\s*-{3}/)
      expect(result.text).not.toContain('**')
      expect(result.text).not.toMatch(/^#{1,6}\s/m)
      expect(result.text).not.toContain('//break')
    })
  }
})
