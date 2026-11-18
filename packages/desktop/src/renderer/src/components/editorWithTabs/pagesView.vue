<template>
  <div
    class="pages-shell"
    :style="geometryStyle"
  >
    <div
      ref="pagesRoot"
      class="pages-view"
      :class="{ spreads: mode === 'spreads', panning: isPanning }"
      @wheel="onWheel"
      @pointerdown="onPointerDown"
      @pointermove="onPointerMove"
      @pointerup="onPointerUp"
      @pointercancel="onPointerUp"
    >
      <div
        class="zoom-frame"
        :style="zoomFrameStyle"
      >
        <div
          ref="zoomPlane"
          class="zoom-plane"
          :style="zoomPlaneStyle"
        >
          <div
            v-if="mode === 'pages'"
            class="pages-stack"
          >
            <article
              v-for="(page, index) in pages"
              :key="index"
              class="page-card"
              :class="{ target: index === targetPageIndex }"
              :data-page-index="index"
            >
              <span class="folio">{{ index + 1 }}</span>
              <div
                class="page-body book-flow"
                :class="editorClass"
                :style="editorStyle"
                :data-role="bookRole || undefined"
              >
                <!-- eslint-disable-next-line vue/no-v-html -->
                <div
                  class="mu-container"
                  v-html="page.html"
                />
              </div>
            </article>
          </div>
          <div
            v-else
            class="spreads-stack"
          >
            <div
              v-for="(spread, index) in spreads"
              :key="index"
              class="spread"
            >
              <article
                v-for="side in (['verso', 'recto'] as const)"
                :key="side"
                class="page-card"
                :class="[side, {
                  blank: spread[side] == null,
                  target: spread[side] != null && pageIndexOf(spread[side]) === targetPageIndex
                }]"
                :data-page-index="spread[side] != null ? pageIndexOf(spread[side]) : undefined"
              >
                <template v-if="spread[side] != null">
                  <span class="folio">{{ pageIndexOf(spread[side]) + 1 }}</span>
                  <div
                    class="page-body book-flow"
                    :class="editorClass"
                    :style="editorStyle"
                    :data-role="bookRole || undefined"
                  >
                    <!-- eslint-disable-next-line vue/no-v-html -->
                    <div
                      class="mu-container"
                      v-html="spread[side]!.html"
                    />
                  </div>
                </template>
              </article>
            </div>
          </div>
        </div>
      </div>
    </div>
    <div
      class="pages-workbench"
      aria-hidden="true"
    >
      <div
        ref="sourceSlot"
        class="pages-source"
      />
      <div
        class="page-measure book-flow"
        :class="editorClass"
        :style="editorStyle"
      >
        <div
          ref="measureHost"
          class="mu-container"
        />
      </div>
    </div>
    <div class="zoom-bar">
      <button
        type="button"
        @click="fitZoom"
      >
        Fit
      </button>
      <span class="zoom-label">{{ zoomPercent }}%</span>
      <button
        type="button"
        @click="resetZoom"
      >
        100%
      </button>
      <span
        v-if="pageCountLabel"
        class="page-count"
        :class="{ warn: pageCountWarn }"
      >{{ pageCountLabel }}</span>
      <span
        v-if="bookCssIssues.length"
        class="page-count warn"
        :title="bookCssIssues.map((i) => i.message).join('\n')"
      >CSS {{ bookCssIssues.length }}</span>
    </div>
    <component
      :is="'style'"
      v-if="bookCssText"
    >
      {{ bookCssText }}
    </component>
  </div>
</template>

<script setup lang="ts">
import { computed, markRaw, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { Muya, type IMuyaOptions } from '@muyajs/core'
import { useEditorStore } from '@/store/editor'
import { usePreferencesStore } from '@/store/preferences'
import bus from '@/bus'
import { DEFAULT_CODE_FONT_FAMILY, DEFAULT_EDITOR_FONT_FAMILY } from '@/config'
import { getMuyaLocale } from '@/util/muyaLocale'
import { collectSegments, layoutPages, type LaidOutPage } from '@/util/pageLayout'
import { isDarkThemeId, resolveMermaidTheme } from 'common/theme'
import { buildSpreadPairs } from 'common/markbreakBreaks'
import { getBookPageSize, pageAspectRatio } from 'common/bookPageSizes'
import { parseBookFrontMatter } from 'common/bookFrontMatter'
import { lintBookCss } from 'common/cssLint'

const editorStore = useEditorStore()
const preferencesStore = usePreferencesStore()
const { currentFile, listToc } = storeToRefs(editorStore)
const bookRole = computed(() => parseBookFrontMatter(currentFile.value?.markdown ?? '').role)
const bookCssText = ref('')
const bookCssIssues = ref<ReturnType<typeof lintBookCss>>([])

const loadBookCss = async() => {
  const pathname = currentFile.value?.pathname
  if (!pathname) {
    bookCssText.value = ''
    bookCssIssues.value = []
    return
  }
  const fm = parseBookFrontMatter(currentFile.value?.markdown ?? '')
  const name = fm.stylesheet || 'book.css'
  const cssPath = window.path.join(window.path.dirname(pathname), name)
  if (!(await window.fileUtils.isFile(cssPath))) {
    bookCssText.value = ''
    bookCssIssues.value = []
    return
  }
  const buf = await window.fileUtils.readFile(cssPath, 'utf8')
  const text = typeof buf === 'string' ? buf : new TextDecoder('utf-8').decode(buf)
  bookCssText.value = text
  bookCssIssues.value = lintBookCss(text)
}

watch(
  () => [currentFile.value?.pathname, currentFile.value?.markdown] as const,
  () => { void loadBookCss() },
  { immediate: true }
)
const {
  bookPageSize,
  bookPageLandscape,
  bookMarginTopMm,
  bookMarginRightMm,
  bookMarginBottomMm,
  bookMarginLeftMm,
  bookTypeFace,
  bookTypeSizePt,
  bookTypeLeading,
  bookTypeTracking,
  bookTypeIndentEm,
  bookTypeMeasureCh,
  documentViewMode,
  editorFontFamily,
  codeFontSize,
  codeFontFamily,
  wrapCodeBlocks,
  codeBlockLineNumbers,
  frontmatterType,
  cjkEmphasis,
  superSubScript,
  footnote,
  texMathDollars,
  texMathGfm,
  texMathSingleBackslash,
  texMathDoubleBackslash,
  fancyLists,
  inlineDiff,
  multilineBlockquote,
  githubAlerts,
  isHtmlEnabled,
  softNewlineAsSpace,
  sequenceTheme,
  theme,
  mermaidLightTheme,
  mermaidDarkTheme,
  language
} = storeToRefs(preferencesStore)

const mode = computed<'pages' | 'spreads'>(() =>
  documentViewMode.value === 'spreads' ? 'spreads' : 'pages'
)

const PX_PER_MM = 96 / 25.4
const PX_PER_PT = 96 / 72

const pageDims = computed(() => {
  const size = getBookPageSize(bookPageSize.value) ?? getBookPageSize('BFormat')!
  const landscape = !!bookPageLandscape.value
  return {
    size,
    landscape,
    widthMm: landscape ? size.heightMm : size.widthMm,
    heightMm: landscape ? size.widthMm : size.heightMm
  }
})

// Same engine options as the editor's Muya, with book typography instead of
// the screen font so the page reads as the printed book will.
const muyaOptions = computed((): Partial<IMuyaOptions> => ({
  markdown: currentFile.value?.markdown ?? '',
  readOnly: true,
  hideQuickInsertHint: true,
  spellcheckEnabled: false,
  locale: getMuyaLocale(language.value),
  fontSize: bookTypeSizePt.value * PX_PER_PT,
  lineHeight: bookTypeLeading.value,
  editorFontFamily: bookTypeFace.value ||
    (editorFontFamily.value ? `${editorFontFamily.value}, ${DEFAULT_EDITOR_FONT_FAMILY}` : DEFAULT_EDITOR_FONT_FAMILY),
  codeFontSize: codeFontSize.value,
  codeFontFamily: codeFontFamily.value
    ? `${codeFontFamily.value}, ${DEFAULT_CODE_FONT_FAMILY}`
    : DEFAULT_CODE_FONT_FAMILY,
  wrapCodeBlocks: wrapCodeBlocks.value,
  codeBlockLineNumbers: codeBlockLineNumbers.value,
  frontmatterType: frontmatterType.value,
  cjkEmphasis: cjkEmphasis.value,
  superSubScript: superSubScript.value,
  footnote: footnote.value,
  texMathDollars: texMathDollars.value,
  texMathGfm: texMathGfm.value,
  texMathSingleBackslash: texMathSingleBackslash.value,
  texMathDoubleBackslash: texMathDoubleBackslash.value,
  fancyLists: fancyLists.value,
  inlineDiff: inlineDiff.value,
  multilineBlockquote: multilineBlockquote.value,
  githubAlerts: githubAlerts.value,
  disableHtml: !isHtmlEnabled.value,
  softNewlineAsSpace: softNewlineAsSpace.value,
  sequenceTheme: sequenceTheme.value as IMuyaOptions['sequenceTheme'],
  plantumlServer: preferencesStore.plantumlServer,
  mermaidTheme: resolveMermaidTheme(theme.value, mermaidLightTheme.value, mermaidDarkTheme.value),
  vegaTheme: isDarkThemeId(theme.value) ? 'dark' : 'latimes'
}))

const pages = ref<LaidOutPage[]>([])
const spreads = computed(() => buildSpreadPairs(pages.value))
const pageCountLabel = computed(() => {
  const n = pages.value.length
  if (!n) return ''
  return `${n} page${n === 1 ? '' : 's'}`
})
const pageCountWarn = computed(() => pages.value.length > 0 && pages.value.length % 4 !== 0)
const pageIndexOf = (page: LaidOutPage | null): number =>
  page ? pages.value.indexOf(page) : -1

/** Class list and inline appearance vars of the rendering Muya's `.mu-editor`. */
const editorClass = ref('mu-editor')
const editorStyle = ref('')

const sourceSlot = ref<HTMLElement | null>(null)
const measureHost = ref<HTMLElement | null>(null)

const nextFrame = (): Promise<void> => new Promise((resolve) => requestAnimationFrame(() => resolve()))

const imagesSettled = (root: Element): Promise<unknown> =>
  Promise.race([
    Promise.all(Array.from(root.querySelectorAll('img')).map((img) =>
      img.complete ? null : new Promise((resolve) => {
        img.addEventListener('load', resolve, { once: true })
        img.addEventListener('error', resolve, { once: true })
      })
    )),
    new Promise((resolve) => setTimeout(resolve, 3000))
  ])

let layoutGeneration = 0

const relayout = async(): Promise<void> => {
  const generation = ++layoutGeneration
  const slot = sourceSlot.value
  const host = measureHost.value
  if (!slot || !host) return
  const mount = document.createElement('div')
  slot.replaceChildren(mount)
  const muya = markRaw(new Muya(mount, muyaOptions.value))
  try {
    muya.init({ focus: false })
    const editorEl = muya.domNode
    editorClass.value = Array.from(editorEl.classList)
      .filter((name) => name !== 'mu-focus-mode')
      .join(' ')
    editorStyle.value = editorEl.getAttribute('style') ?? ''
    await nextTick()
    await document.fonts.ready
    await imagesSettled(editorEl)
    await nextFrame()
    if (generation !== layoutGeneration) return
    const container = editorEl.querySelector('.mu-container')
    if (!container) return
    pages.value = layoutPages(
      collectSegments(container),
      host,
      (el) => el.scrollHeight <= el.clientHeight
    )
  } finally {
    muya.destroy()
    slot.replaceChildren()
  }
}

let relayoutTimer: ReturnType<typeof setTimeout> | undefined
const scheduleRelayout = (delay = 150): void => {
  clearTimeout(relayoutTimer)
  relayoutTimer = setTimeout(() => {
    void relayout()
  }, delay)
}

const pagesRoot = ref<HTMLElement | null>(null)
const zoomPlane = ref<HTMLElement | null>(null)
const targetPageIndex = ref(-1)
let targetTimer: ReturnType<typeof setTimeout> | undefined

const zoom = ref(1)
const zoomPercent = computed(() => Math.round(zoom.value * 100))
const ZOOM_MIN = 0.25
const ZOOM_MAX = 3

// Zoom is a paint-only transform so text wraps exactly as it was measured;
// the frame takes the scaled size so scrollbars and centring follow it.
const planeSize = ref({ width: 0, height: 0 })
const zoomPlaneStyle = computed(() => ({ transform: `scale(${zoom.value})` }))
const zoomFrameStyle = computed(() => ({
  width: `${planeSize.value.width * zoom.value}px`,
  height: `${planeSize.value.height * zoom.value}px`
}))
let planeObserver: ResizeObserver | null = null

const fitZoom = (): void => {
  const root = pagesRoot.value
  if (!root) return
  const pageWidthPx = pageDims.value.widthMm * PX_PER_MM
  const contentWidth = mode.value === 'spreads' ? pageWidthPx * 2 + 8 : pageWidthPx
  const available = Math.max(1, root.clientWidth - 48)
  zoom.value = Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, available / contentWidth))
}

const resetZoom = (): void => {
  zoom.value = 1
}

const onWheel = (event: WheelEvent): void => {
  if (!event.ctrlKey && !event.metaKey) return
  event.preventDefault()
  const factor = event.deltaY < 0 ? 1.08 : 1 / 1.08
  zoom.value = Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, zoom.value * factor))
}

const isPanning = ref(false)
let panPointerId: number | null = null
let panOriginX = 0
let panOriginY = 0
let panScrollLeft = 0
let panScrollTop = 0

const onPointerDown = (event: PointerEvent): void => {
  if (event.button !== 0) return
  const root = pagesRoot.value
  if (!root) return
  isPanning.value = true
  panPointerId = event.pointerId
  panOriginX = event.clientX
  panOriginY = event.clientY
  panScrollLeft = root.scrollLeft
  panScrollTop = root.scrollTop
  root.setPointerCapture(event.pointerId)
}

const onPointerMove = (event: PointerEvent): void => {
  if (!isPanning.value || panPointerId !== event.pointerId) return
  const root = pagesRoot.value
  if (!root) return
  root.scrollLeft = panScrollLeft - (event.clientX - panOriginX)
  root.scrollTop = panScrollTop - (event.clientY - panOriginY)
}

const onPointerUp = (event: PointerEvent): void => {
  if (panPointerId !== event.pointerId) return
  isPanning.value = false
  panPointerId = null
}

// TOC slugs are per-block ids; resolve slug -> TOC ordinal -> the page that
// heading starts on, mirroring editor TOC navigation.
const handleScrollToHeader = (slug: unknown): void => {
  const tocIndex = listToc.value.findIndex((item) => item.slug === slug)
  if (tocIndex < 0) return
  const pageIndex = pages.value.findIndex((page) => page.headingOrdinals.includes(tocIndex))
  if (pageIndex < 0) return
  targetPageIndex.value = pageIndex
  void nextTick(() => {
    const root = pagesRoot.value
    const card = root?.querySelector(`[data-page-index="${pageIndex}"]`)
    if (!root || !card) return
    const top = root.scrollTop + card.getBoundingClientRect().top -
      root.getBoundingClientRect().top - 24
    root.scrollTo({ top, behavior: 'smooth' })
  })
  clearTimeout(targetTimer)
  targetTimer = setTimeout(() => {
    targetPageIndex.value = -1
  }, 1800)
}

onMounted(() => {
  bus.on('scroll-to-header', handleScrollToHeader)
  if (zoomPlane.value) {
    planeObserver = new ResizeObserver(([entry]) => {
      const box = entry.borderBoxSize?.[0]
      planeSize.value = box
        ? { width: box.inlineSize, height: box.blockSize }
        : { width: entry.contentRect.width, height: entry.contentRect.height }
    })
    planeObserver.observe(zoomPlane.value)
  }
  void relayout()
  void nextTick(fitZoom)
})
onBeforeUnmount(() => {
  bus.off('scroll-to-header', handleScrollToHeader)
  planeObserver?.disconnect()
  clearTimeout(targetTimer)
  clearTimeout(relayoutTimer)
  layoutGeneration++
})

watch(muyaOptions, () => scheduleRelayout())
watch(
  () => [
    pageDims.value.widthMm,
    pageDims.value.heightMm,
    bookMarginTopMm.value,
    bookMarginRightMm.value,
    bookMarginBottomMm.value,
    bookMarginLeftMm.value,
    bookTypeTracking.value,
    bookTypeIndentEm.value,
    bookTypeMeasureCh.value
  ],
  () => scheduleRelayout(0)
)
watch([mode, () => pageDims.value.widthMm], () => {
  void nextTick(fitZoom)
})

const geometryStyle = computed(() => {
  const { size, landscape, widthMm, heightMm } = pageDims.value
  return {
    '--page-ratio': String(pageAspectRatio(size.widthMm, size.heightMm, landscape)),
    '--page-width-mm': `${widthMm}`,
    '--page-height-mm': `${heightMm}`,
    '--m-top': `${bookMarginTopMm.value}mm`,
    '--m-right': `${bookMarginRightMm.value}mm`,
    '--m-bottom': `${bookMarginBottomMm.value}mm`,
    '--m-left': `${bookMarginLeftMm.value}mm`,
    '--type-tracking': `${bookTypeTracking.value}em`,
    '--type-indent': `${bookTypeIndentEm.value}em`,
    '--type-measure': bookTypeMeasureCh.value > 0 ? `${bookTypeMeasureCh.value}ch` : 'none'
  }
})
</script>

<style scoped>
/* Non-scrolling frame so the zoom control stays pinned inside the view. */
.pages-shell {
  position: relative;
  height: 100%;
  overflow: hidden;
}
.pages-view {
  height: 100%;
  overflow: auto;
  box-sizing: border-box;
  background: var(--editorBgColor);
  padding: 2rem 1.5rem 3.5rem;
  cursor: grab;
  /* The scrollbar is the reader's progress gauge through the book: thumb
     size and position show how much there is and where you are. Keep it
     visible but quiet. */
  scrollbar-width: thin;
  scrollbar-color: color-mix(in srgb, var(--editorColor) 25%, transparent)
    transparent;
}
.pages-view.panning {
  cursor: grabbing;
}
.pages-view::-webkit-scrollbar {
  width: 10px;
}
.pages-view::-webkit-scrollbar-thumb {
  background: color-mix(in srgb, var(--editorColor) 22%, transparent);
  border: 3px solid var(--editorBgColor);
  border-radius: 6px;
}
.pages-view::-webkit-scrollbar-track {
  background: transparent;
}
.zoom-frame {
  margin-inline: auto;
}
.zoom-plane {
  width: max-content;
  transform-origin: 0 0;
}
.pages-stack,
.spreads-stack {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  width: max-content;
}
.spread {
  display: flex;
  gap: 0.5rem;
}
.page-card {
  position: relative;
  /* True trim size: the page body must match .page-measure to the pixel, so
     no border (it would eat into the content box). */
  width: calc(var(--page-width-mm) * 1mm);
  height: calc(var(--page-height-mm) * 1mm);
  flex: none;
  background: color-mix(in srgb, var(--editorColor) 3%, var(--editorBgColor));
  box-shadow: 0 0 0 1px color-mix(in srgb, var(--editorColor) 9%, transparent);
  border-radius: 6px;
  padding: var(--m-top) var(--m-right) var(--m-bottom) var(--m-left);
  box-sizing: border-box;
  overflow: hidden;
}
.page-card.target {
  box-shadow: 0 0 0 1px color-mix(in srgb, var(--themeColor, #3d75dd) 55%, transparent);
}
.page-card.blank {
  background: transparent;
  box-shadow: 0 0 0 1px color-mix(in srgb, var(--editorColor) 7%, transparent);
}
.folio {
  position: absolute;
  bottom: 0.45rem;
  font-size: 0.65rem;
  letter-spacing: 0.06em;
  opacity: 0.3;
}
.verso .folio {
  left: 0.65rem;
}
.recto .folio,
.pages-stack .folio {
  right: 0.65rem;
}

/* Page bodies and the measuring host share these rules so `fits` sees the
   same layout the reader does. */
.page-body,
.page-measure {
  width: 100%;
  height: 100%;
  cursor: inherit;
  letter-spacing: var(--type-tracking);
}
.page-body > .mu-container,
.page-measure > .mu-container {
  height: 100%;
  min-height: 0;
  max-width: var(--type-measure);
  margin: 0;
  padding: 0;
  overflow: hidden;
  background: transparent;
}
.book-flow :deep(p.mu-paragraph + p.mu-paragraph:not(.mb-continued)) {
  text-indent: var(--type-indent);
}
.book-flow :deep(.mu-copy-header-link),
.book-flow :deep(.mu-fold-toggle),
.book-flow :deep(.mu-code-copy) {
  display: none;
}

/* Off-screen rendering and measuring area; laid out but never painted. */
.pages-workbench {
  position: absolute;
  top: 0;
  left: -100000px;
  visibility: hidden;
  pointer-events: none;
}
.pages-source {
  width: calc((var(--page-width-mm) * 1mm) - var(--m-left) - var(--m-right));
}
.pages-source :deep(.mu-container) {
  max-width: var(--type-measure);
  padding: 0;
  margin: 0;
}
.page-measure {
  width: calc((var(--page-width-mm) * 1mm) - var(--m-left) - var(--m-right));
  height: calc((var(--page-height-mm) * 1mm) - var(--m-top) - var(--m-bottom));
}

.zoom-bar {
  position: absolute;
  right: 1.25rem;
  bottom: 0.75rem;
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.25rem 0.45rem;
  border-radius: 6px;
  background: color-mix(in srgb, var(--editorBgColor) 88%, var(--editorColor));
  border: 1px solid color-mix(in srgb, var(--editorColor) 12%, transparent);
  color: color-mix(in srgb, var(--editorColor) 70%, transparent);
  font-size: 0.72rem;
  letter-spacing: 0.02em;
  cursor: default;
  z-index: 2;
}
.zoom-bar button {
  appearance: none;
  border: 0;
  background: transparent;
  color: inherit;
  cursor: pointer;
  padding: 0.1rem 0.25rem;
  border-radius: 4px;
}
.zoom-bar button:hover {
  background: color-mix(in srgb, var(--editorColor) 8%, transparent);
}
.zoom-label {
  min-width: 2.6rem;
  text-align: center;
  opacity: 0.85;
}
.page-count {
  margin-left: 0.35rem;
  font-size: 0.85em;
  opacity: 0.8;
}
.page-count.warn {
  color: #a65;
  opacity: 1;
}
</style>
