/**
 * Online Pages view — same layout engine as desktop pages mode.
 * `//break` / `//break page` become folio boundaries (not visible text).
 */
import { Muya } from '@muyajs/core'
import { getBookPageSize } from './bookPageSizes'
import { buildSpreadPairs } from './markbreakBreaks'
import { applyCalculationsToTables } from './markbreakCalc'
import { collectSegments, layoutPages, type LaidOutPage } from './pageLayout'

const PX_PER_PT = 96 / 72

export type PagesMode = 'off' | 'pages' | 'spreads'

export interface PagesController {
  setMode: (mode: PagesMode) => void
  mode: () => PagesMode
  setMarkdown: (markdown: string) => void
  go: (delta: number) => void
  goToHeading: (tocIndex: number) => void
  pageCount: () => number
  pageIndex: () => number
  destroy: () => void
}

export function mountPages(host: HTMLElement): PagesController {
  const shell = host
  shell.className = 'pages-shell'
  shell.hidden = true
  shell.innerHTML = `
    <div class="pages-view" tabindex="0" aria-label="Paged preview">
      <div class="pages-stack"></div>
    </div>
    <div class="pages-workbench" aria-hidden="true">
      <div class="pages-source"></div>
      <div class="page-measure book-flow">
        <div class="mu-container pages-measure-host"></div>
      </div>
    </div>
    <div class="zoom-bar">
      <span class="page-count"></span>
      <span class="page-hint">← → pages</span>
    </div>
  `

  const view = shell.querySelector('.pages-view') as HTMLElement
  const stack = shell.querySelector('.pages-stack') as HTMLElement
  const sourceSlot = shell.querySelector('.pages-source') as HTMLElement
  const measureHost = shell.querySelector('.pages-measure-host') as HTMLElement
  const countEl = shell.querySelector('.page-count') as HTMLElement

  // B-format paperback defaults (same spirit as desktop book preview).
  const size = getBookPageSize('BFormat')!
  const widthMm = size.widthMm
  const heightMm = size.heightMm
  const marginMm = { top: 18, right: 16, bottom: 20, left: 18 }
  const typeSizePt = 11
  const typeLeading = 1.35

  shell.style.setProperty('--page-width-mm', String(widthMm))
  shell.style.setProperty('--page-height-mm', String(heightMm))
  shell.style.setProperty('--m-top', `${marginMm.top}mm`)
  shell.style.setProperty('--m-right', `${marginMm.right}mm`)
  shell.style.setProperty('--m-bottom', `${marginMm.bottom}mm`)
  shell.style.setProperty('--m-left', `${marginMm.left}mm`)
  shell.style.setProperty('--type-indent', '1.2em')
  shell.style.setProperty('--type-measure', 'none')
  shell.style.setProperty('--type-tracking', '0')

  let mode: PagesMode = 'off'
  let markdown = ''
  let pages: LaidOutPage[] = []
  let index = 0
  let generation = 0
  let editorClass = 'mu-editor'
  let editorStyle = ''

  const nextFrame = (): Promise<void> =>
    new Promise((resolve) => requestAnimationFrame(() => resolve()))

  const imagesSettled = (root: Element): Promise<unknown> =>
    Promise.race([
      Promise.all(
        Array.from(root.querySelectorAll('img')).map((img) =>
          img.complete
            ? null
            : new Promise((resolve) => {
                img.addEventListener('load', resolve, { once: true })
                img.addEventListener('error', resolve, { once: true })
              })
        )
      ),
      new Promise((resolve) => setTimeout(resolve, 3000))
    ])

  const relayout = async (): Promise<void> => {
    const gen = ++generation
    if (mode === 'off' || !markdown.trim()) {
      pages = []
      render()
      return
    }
    const mount = document.createElement('div')
    sourceSlot.replaceChildren(mount)
    const muya = new Muya(mount, {
      markdown,
      readOnly: true,
      hideQuickInsertHint: true,
      spellcheckEnabled: false,
      fontSize: typeSizePt * PX_PER_PT,
      lineHeight: typeLeading,
      footnote: true
    })
    try {
      muya.init({ focus: false })
      const editorEl = muya.domNode
      editorClass = Array.from(editorEl.classList)
        .filter((name) => name !== 'mu-focus-mode')
        .join(' ')
      editorStyle = editorEl.getAttribute('style') ?? ''
      await document.fonts.ready
      await imagesSettled(editorEl)
      await nextFrame()
      if (gen !== generation) return
      const container = editorEl.querySelector('.mu-container')
      if (!container) return
      // MarkBreak §8: show calculated results (and drop hidden columns) in the
      // folio preview — same reader surface as export, not raw `=C2*C3`.
      applyCalculationsToTables(container)
      pages = layoutPages(collectSegments(container), measureHost, (el) => el.scrollHeight <= el.clientHeight)
      if (index >= pages.length) index = Math.max(0, pages.length - 1)
      render()
    } finally {
      muya.destroy()
      sourceSlot.replaceChildren()
    }
  }

  const render = (): void => {
    countEl.textContent = pages.length
      ? `${index + 1} / ${pages.length}`
      : ''
    if (mode === 'spreads') {
      const spreads = buildSpreadPairs(pages)
      stack.className = 'spreads-stack'
      stack.replaceChildren(
        ...spreads.map((spread, spreadIndex) => {
          const row = document.createElement('div')
          row.className = 'spread'
          for (const side of ['verso', 'recto'] as const) {
            const page = spread[side]
            const card = document.createElement('article')
            card.className = `page-card ${side}${page == null ? ' blank' : ''}`
            if (page) {
              const pageIndex = pages.indexOf(page)
              card.dataset.pageIndex = String(pageIndex)
              if (pageIndex === index) card.classList.add('target')
              card.innerHTML = `
                <span class="folio">${pageIndex + 1}</span>
                <div class="page-body book-flow ${editorClass}" style="${editorStyle}">
                  <div class="mu-container">${page.html}</div>
                </div>`
            }
            row.appendChild(card)
          }
          row.dataset.spreadIndex = String(spreadIndex)
          return row
        })
      )
    } else {
      stack.className = 'pages-stack'
      stack.replaceChildren(
        ...pages.map((page, pageIndex) => {
          const card = document.createElement('article')
          card.className = `page-card${pageIndex === index ? ' target' : ''}`
          card.dataset.pageIndex = String(pageIndex)
          card.innerHTML = `
            <span class="folio">${pageIndex + 1}</span>
            <div class="page-body book-flow ${editorClass}" style="${editorStyle}">
              <div class="mu-container">${page.html}</div>
            </div>`
          return card
        })
      )
    }
    const target = stack.querySelector(`[data-page-index="${index}"]`)
    target?.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
  }

  const setMode = (next: PagesMode): void => {
    mode = next
    shell.hidden = next === 'off'
    void relayout()
    if (next !== 'off') view.focus()
  }

  const go = (delta: number): void => {
    if (!pages.length) return
    index = Math.max(0, Math.min(pages.length - 1, index + delta))
    render()
  }

  const goToHeading = (tocIndex: number): void => {
    const pageIndex = pages.findIndex((page) => page.headingOrdinals.includes(tocIndex))
    if (pageIndex < 0) return
    index = pageIndex
    render()
  }

  const onKey = (event: KeyboardEvent): void => {
    if (mode === 'off' || shell.hidden) return
    if (event.defaultPrevented || event.altKey || event.ctrlKey || event.metaKey) return
    // Only when the pages surface actually has focus — never steal arrows from
    // the TOC, menus, or a still-mounted editor underneath.
    const active = document.activeElement
    if (!(active === view || (active instanceof Node && view.contains(active)))) return
    const target = event.target
    if (
      target instanceof HTMLElement &&
      (target.closest('input, textarea, select, [contenteditable="true"]') ||
        target.isContentEditable) &&
      !view.contains(target) &&
      target !== view
    ) {
      return
    }
    switch (event.key) {
      case 'ArrowRight':
      case 'ArrowDown':
      case 'PageDown':
      case ' ':
        event.preventDefault()
        go(1)
        break
      case 'ArrowLeft':
      case 'ArrowUp':
      case 'PageUp':
        event.preventDefault()
        go(-1)
        break
      case 'Home':
        event.preventDefault()
        index = 0
        render()
        break
      case 'End':
        event.preventDefault()
        index = Math.max(0, pages.length - 1)
        render()
        break
      default:
        break
    }
  }

  document.addEventListener('keydown', onKey, true)

  return {
    setMode,
    mode: () => mode,
    setMarkdown: (md: string) => {
      markdown = md
      if (mode !== 'off') void relayout()
    },
    go,
    goToHeading,
    pageCount: () => pages.length,
    pageIndex: () => index,
    destroy: () => {
      document.removeEventListener('keydown', onKey, true)
      shell.hidden = true
      shell.replaceChildren()
    }
  }
}
