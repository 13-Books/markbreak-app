// @vitest-environment happy-dom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { Muya } from '@muyajs/core'
import { collectSegments, layoutPages, type FitsPredicate } from '@/util/pageLayout'

// Muya fetches Prism grammars with a relative dynamic import that Vite cannot
// glob from the desktop test root; highlighting is irrelevant to pagination.
vi.mock('../../../../muya/src/utils/prism/loadLanguage', () => ({
  default: () => async() => [],
  loadedLanguages: new Set<string>(),
  transformAliasToOrigin: (langs: string[]) => langs
}))

// Pages must show exactly what the editor renders: these specs mount a real
// read-only Muya and lay out its own block nodes. happy-dom has no layout, so
// packing uses a character budget; the real-layout gate (no clipping, visible
// text) is test/e2e/pages-mode.spec.ts.

const editors: Muya[] = []
afterEach(() => {
  for (const muya of editors.splice(0)) {
    muya.destroy()
    muya.domNode.remove()
  }
})

const renderWithMuya = (markdown: string): Element => {
  const host = document.createElement('div')
  document.body.append(host)
  const muya = new Muya(host, { markdown, readOnly: true })
  muya.init({ focus: false })
  editors.push(muya)
  return muya.domNode.querySelector('.mu-container')!
}

const budget = (chars: number): FitsPredicate => (host) =>
  (host.textContent ?? '').replace(/\s+/g, ' ').trim().length <= chars

const layout = (markdown: string, chars: number) => {
  const container = renderWithMuya(markdown)
  const host = document.createElement('div')
  document.body.append(host)
  const pages = layoutPages(collectSegments(container), host, budget(chars))
  host.remove()
  return { container, pages }
}

const asElement = (html: string): HTMLElement => {
  const div = document.createElement('div')
  div.innerHTML = html
  return div
}

const words = (text: string): string[] => text.split(/\s+/).filter(Boolean)

/** Words from every text node, so adjacent cells/blocks never fuse. */
const textWords = (root: Node, skip?: (el: Element) => boolean): string[] => {
  const out: string[] = []
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT)
  for (let node = walker.nextNode(); node; node = walker.nextNode()) {
    const parent = node.parentElement
    if (skip && parent && skip(parent)) continue
    out.push(...words(node.textContent ?? ''))
  }
  return out
}

const tokens = (prefix: string, count: number): string =>
  Array.from({ length: count }, (_, i) => `${prefix}${i}`).join(' ')

const FIXTURE = [
  '---',
  'title: Front matter is not page text',
  '---',
  '',
  '# Book II',
  '',
  `${tokens('para', 60)} with **strong** and *emphasis* and \`code\`.`,
  '',
  '## Three styles',
  '',
  '| Style | Motto | Done |',
  '|-------|-------|------|',
  ...Array.from({ length: 12 }, (_, i) => `| row${i} | motto${i} | done${i} |`),
  '',
  '1. first item',
  '2. second item',
  '3. third item',
  '4. fourth item',
  '',
  '> quoted line',
  '',
  '//break',
  '',
  '## After the break',
  '',
  tokens('tail', 40)
].join('\n')

describe('pageLayout: Pages show the editor\'s own rendering', () => {
  it('parity: pages hold exactly the text Muya rendered — nothing dropped or added', () => {
    const { container, pages } = layout(FIXTURE, 160)
    expect(pages.length).toBeGreaterThan(3)
    const reference = Array.from(container.children)
      .filter((block) => !block.classList.contains('mu-frontmatter'))
      .filter((block) => (block.textContent ?? '').trim() !== '//break')
      .flatMap((block) => textWords(block))
    // Continued tables repeat their header row; it is page furniture, not content.
    const placed = pages.flatMap((p) =>
      textWords(asElement(p.html), (el) => !!el.closest('.mb-repeated-header'))
    )
    expect(placed.sort()).toEqual(reference.sort())
  })

  it('pages are built from Muya block nodes, not a second renderer', () => {
    const { pages } = layout(FIXTURE, 160)
    const all = asElement(pages.map((p) => p.html).join(''))
    expect(all.querySelector('table')).not.toBeNull()
    expect(all.querySelector('ol')).not.toBeNull()
    expect(all.querySelector('blockquote')).not.toBeNull()
    for (const block of Array.from(all.children)) {
      expect(block.className, block.outerHTML.slice(0, 80)).toMatch(/\bmu-/)
    }
    const text = all.textContent ?? ''
    expect(text).not.toContain('Front matter is not page text')
    expect(text).not.toContain('//break')
  })

  it('splits long tables by row and repeats the header', () => {
    const { pages } = layout(FIXTURE, 160)
    const tablePages = pages.map((p) => asElement(p.html)).filter((el) => el.querySelector('table'))
    expect(tablePages.length).toBeGreaterThan(1)
    for (const el of tablePages) {
      expect(el.querySelector('table tr')?.textContent).toMatch(/Style\s*Motto\s*Done/)
    }
    const rows = tablePages.flatMap((el) => (el.textContent ?? '').match(/row\d+/g) ?? [])
    expect(rows).toEqual(Array.from({ length: 12 }, (_, i) => `row${i}`))
  })

  it('continues ordered-list numbering across a page split', () => {
    const { pages } = layout(['1. aaaa aaaa', '2. bbbb bbbb', '3. cccc cccc', '4. dddd dddd'].join('\n'), 25)
    const lists = pages
      .map((p) => asElement(p.html).querySelector('ol'))
      .filter((ol): ol is HTMLOListElement => !!ol)
    expect(lists.length).toBeGreaterThan(1)
    expect(lists[1].getAttribute('start')).toBe(String(1 + lists[0].querySelectorAll(':scope > li').length))
  })

  it('splits prose mid-paragraph and keeps inline formatting nodes', () => {
    const { pages } = layout(`${tokens('w', 30)} **bold tail** end`, 60)
    expect(pages.length).toBeGreaterThan(1)
    const all = asElement(pages.map((p) => p.html).join(''))
    expect(all.querySelector('.mb-continued')).not.toBeNull()
    expect(all.querySelector('strong')).not.toBeNull()
  })

  it('never strands a heading at the bottom of a page', () => {
    const { pages } = layout(FIXTURE, 160)
    for (const page of pages.slice(0, -1)) {
      expect(asElement(page.html).lastElementChild?.tagName ?? '').not.toMatch(/^H[1-6]$/)
    }
  })

  it('maps every heading to the page it starts on, in TOC order across breaks', () => {
    const { pages } = layout(FIXTURE, 160)
    expect(pages.flatMap((p) => p.headingOrdinals)).toEqual([0, 1, 2])
    const last = pages.findIndex((p) => p.headingOrdinals.includes(2))
    expect(asElement(pages[last].html).textContent).toContain('After the break')
  })

  it('places an oversized unsplittable block alone instead of looping', () => {
    const { pages } = layout(`# ${'x'.repeat(200)}\n\nafter`, 50)
    expect(pages.length).toBe(2)
    expect(asElement(pages[1].html).textContent).toContain('after')
  })
})
