/**
 * Pages/Spreads layout. Rendering is not done here: the caller renders the
 * manuscript with Muya itself (read-only, page width, book typography) and
 * hands over its `.mu-container`. This module only decides where pages break,
 * moving Muya's own block nodes into a page-sized host and asking `fits`
 * after each placement. Overflowing blocks split structurally: tables by row
 * (header repeated), lists by item, code by line, prose by word.
 */
import { breakKind, isFlowBreakLine } from 'common/markbreakBreaks'

export interface LaidOutPage {
  html: string
  /** Ordinals (document order, matching the TOC) of headings starting here. */
  headingOrdinals: number[]
}

export type FitsPredicate = (host: HTMLElement) => boolean

const ORDINAL_ATTR = 'data-heading-ordinal'
export const CONTINUED_CLASS = 'mb-continued'

const isHeading = (node: Element | null): boolean => !!node && /^H[1-6]$/.test(node.tagName)

const isFlowBreakBlock = (block: Element): boolean =>
  block.tagName === 'P' && isFlowBreakLine(block.textContent ?? '')

/**
 * Split Muya's top-level blocks into folio segments (flow breaks start a new
 * page and are not shown), drop front matter, and tag top-level headings with
 * their TOC ordinal. Returns detached clones; `container` is untouched.
 */
export const collectSegments = (container: Element): Element[][] => {
  const segments: Element[][] = [[]]
  let ordinal = 0
  for (const child of Array.from(container.children)) {
    if (child.classList.contains('mu-frontmatter')) continue
    if (isFlowBreakBlock(child)) {
      // 1-based folio index of the next content page after this break.
      let next = segments.length + 1
      const kind = breakKind(child.textContent ?? '')
      if (kind === 'odd') {
        while (next % 2 === 0) {
          segments.push([])
          next++
        }
      } else if (kind === 'even') {
        while (next % 2 === 1) {
          segments.push([])
          next++
        }
      }
      segments.push([])
      continue
    }
    const clone = child.cloneNode(true) as Element
    if (isHeading(clone)) clone.setAttribute(ORDINAL_ATTR, String(ordinal++))
    segments[segments.length - 1].push(clone)
  }
  return segments
}

const tryFits = (host: HTMLElement, candidate: Element, fits: FitsPredicate): boolean => {
  host.appendChild(candidate)
  const ok = fits(host)
  host.removeChild(candidate)
  return ok
}

/** Largest k in [1, n] for which build(k) fits, or 0. Assumes monotonicity. */
const largestFitting = (
  n: number,
  host: HTMLElement,
  fits: FitsPredicate,
  build: (k: number) => Element
): number => {
  let lo = 0
  let hi = n
  while (lo < hi) {
    const mid = Math.ceil((lo + hi) / 2)
    if (tryFits(host, build(mid), fits)) lo = mid
    else hi = mid - 1
  }
  return lo
}

interface Split {
  head: Element
  tail: Element
}

const markContinued = (split: Split | null): Split | null => {
  split?.tail.classList.add(CONTINUED_CLASS)
  return split
}

export const REPEATED_HEADER_CLASS = 'mb-repeated-header'

/** Muya tables are `figure.mu-table > table > tr…`; the first row is the header. */
const splitTable = (block: Element, host: HTMLElement, fits: FitsPredicate): Split | null => {
  const table = block.tagName === 'TABLE' ? block : block.querySelector('table')
  if (!table) return null
  const allRows = Array.from(table.querySelectorAll(':scope > tr, :scope > thead > tr, :scope > tbody > tr'))
  const [header, ...rows] = allRows
  if (!header || rows.length < 2) return null
  const build = (from: number, to: number, repeatHeader: boolean): Element => {
    const tableClone = table.cloneNode(false) as Element
    const headerClone = header.cloneNode(true) as Element
    if (repeatHeader) headerClone.classList.add(REPEATED_HEADER_CLASS)
    tableClone.appendChild(headerClone)
    for (const row of rows.slice(from, to)) tableClone.appendChild(row.cloneNode(true))
    if (table === block) return tableClone
    const wrapper = block.cloneNode(false) as Element
    wrapper.appendChild(tableClone)
    return wrapper
  }
  const k = largestFitting(rows.length - 1, host, fits, (n) => build(0, n, false))
  if (k === 0) return null
  return markContinued({ head: build(0, k, false), tail: build(k, rows.length, true) })
}

const splitList = (list: Element, host: HTMLElement, fits: FitsPredicate): Split | null => {
  const items = Array.from(list.children).filter((child) => child.tagName === 'LI')
  if (items.length < 2) return null
  const build = (from: number, to: number): Element => {
    const clone = list.cloneNode(false) as Element
    for (const item of items.slice(from, to)) clone.appendChild(item.cloneNode(true))
    return clone
  }
  const k = largestFitting(items.length - 1, host, fits, (n) => build(0, n))
  if (k === 0) return null
  const tail = build(k, items.length)
  if (list.tagName === 'OL') {
    const start = Number(list.getAttribute('start') ?? '1') || 1
    tail.setAttribute('start', String(start + k))
  }
  return markContinued({ head: build(0, k), tail })
}

/** Split at text boundaries (after each `boundary` match), preserving inline markup. */
const splitText = (
  block: Element,
  host: HTMLElement,
  fits: FitsPredicate,
  boundary: RegExp
): Split | null => {
  const cuts: Array<{ node: Text, offset: number }> = []
  const walker = document.createTreeWalker(block, NodeFilter.SHOW_TEXT)
  for (let node = walker.nextNode() as Text | null; node; node = walker.nextNode() as Text | null) {
    const re = new RegExp(boundary.source, 'g')
    for (let match = re.exec(node.data); match; match = re.exec(node.data)) {
      const offset = match.index + match[0].length
      if (offset < node.data.length) cuts.push({ node, offset })
    }
  }
  if (cuts.length === 0) return null
  const slice = (cut: { node: Text, offset: number }, head: boolean): Element => {
    const range = document.createRange()
    if (head) {
      range.setStart(block, 0)
      range.setEnd(cut.node, cut.offset)
    } else {
      range.setStart(cut.node, cut.offset)
      range.setEnd(block, block.childNodes.length)
    }
    const clone = block.cloneNode(false) as Element
    clone.appendChild(range.cloneContents())
    return clone
  }
  const k = largestFitting(cuts.length, host, fits, (n) => slice(cuts[n - 1], true))
  if (k === 0) return null
  return markContinued({ head: slice(cuts[k - 1], true), tail: slice(cuts[k - 1], false) })
}

const splitBlock = (block: Element, host: HTMLElement, fits: FitsPredicate): Split | null => {
  const tag = block.tagName
  if (isHeading(block)) return null
  if (tag === 'TABLE' || (tag === 'FIGURE' && block.querySelector('table'))) {
    return splitTable(block, host, fits)
  }
  if (tag === 'UL' || tag === 'OL') {
    return splitList(block, host, fits) ?? splitText(block, host, fits, /\s+/)
  }
  if (tag === 'PRE') return splitText(block, host, fits, /\n/)
  if (tag === 'HR' || tag === 'IMG' || tag === 'FIGURE') return null
  return splitText(block, host, fits, /\s+/)
}

const collectOrdinals = (host: HTMLElement): number[] =>
  Array.from(host.querySelectorAll(`[${ORDINAL_ATTR}]`)).map((el) =>
    Number(el.getAttribute(ORDINAL_ATTR))
  )

/**
 * Pack segments into pages. `host` must be styled exactly like a page body
 * (same wrapper classes, width, height) so `fits` reflects real layout; it is
 * left empty afterwards.
 */
export const layoutPages = (
  segments: Element[][],
  host: HTMLElement,
  fits: FitsPredicate
): LaidOutPage[] => {
  const pages: LaidOutPage[] = []
  const flush = () => {
    pages.push({ html: host.innerHTML, headingOrdinals: collectOrdinals(host) })
    host.replaceChildren()
  }
  host.replaceChildren()
  for (const segment of segments) {
    const queue = [...segment]
    const before = pages.length
    while (queue.length > 0) {
      const block = queue.shift()!
      host.appendChild(block)
      if (fits(host)) continue
      host.removeChild(block)
      const split = splitBlock(block, host, fits)
      if (split) {
        host.appendChild(split.head)
        flush()
        queue.unshift(split.tail)
        continue
      }
      if (host.childElementCount === 0) {
        // Taller than an empty page and unsplittable: place it alone.
        host.appendChild(block)
        flush()
        continue
      }
      // Keep headings with the block that follows them.
      const carried: Element[] = []
      while (host.childElementCount > 1 && isHeading(host.lastElementChild)) {
        carried.unshift(host.removeChild(host.lastElementChild!))
      }
      flush()
      queue.unshift(...carried, block)
    }
    if (host.childElementCount > 0 || pages.length === before) flush()
  }
  return pages.length > 0 ? pages : [{ html: '', headingOrdinals: [] }]
}
