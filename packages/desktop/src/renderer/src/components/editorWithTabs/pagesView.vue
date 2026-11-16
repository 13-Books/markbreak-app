<template>
  <div
    class="pages-view"
    :class="{ spreads: mode === 'spreads' }"
    :style="geometryStyle"
  >
    <div class="pages-toolbar">
      <button
        type="button"
        :class="{ active: mode === 'pages' }"
        @click="mode = 'pages'"
      >
        {{ t('pagesView.pages') }}
      </button>
      <button
        type="button"
        :class="{ active: mode === 'spreads' }"
        @click="mode = 'spreads'"
      >
        {{ t('pagesView.spreads') }}
      </button>
      <span class="hint">{{ t('pagesView.hint') }}</span>
    </div>
    <div
      v-if="mode === 'pages'"
      class="pages-stack"
    >
      <article
        v-for="(page, index) in folioPages"
        :key="index"
        class="page-card"
      >
        <span class="folio">{{ index + 1 }}</span>
        <pre class="body">{{ page || ' ' }}</pre>
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
          class="page-card verso"
          :class="{ blank: !spread.verso }"
        >
          <span
            v-if="spread.verso != null"
            class="folio"
          >{{ folioFor(spread, 'verso') }}</span>
          <pre class="body">{{ spread.verso ?? '' }}</pre>
        </article>
        <article
          class="page-card recto"
          :class="{ blank: !spread.recto }"
        >
          <span
            v-if="spread.recto != null"
            class="folio"
          >{{ folioFor(spread, 'recto') }}</span>
          <pre class="body">{{ spread.recto ?? '' }}</pre>
        </article>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { storeToRefs } from 'pinia'
import { useEditorStore } from '@/store/editor'
import { usePreferencesStore } from '@/store/preferences'
import { buildSpreadPairs, splitFolioPages } from 'common/markbreakBreaks'
import { getBookPageSize, pageAspectRatio } from 'common/bookPageSizes'

const { t } = useI18n()
const editorStore = useEditorStore()
const preferencesStore = usePreferencesStore()
const { currentFile } = storeToRefs(editorStore)
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
  documentViewMode
} = storeToRefs(preferencesStore)

const mode = ref<'pages' | 'spreads'>(
  documentViewMode.value === 'spreads' ? 'spreads' : 'pages'
)

watch(documentViewMode, (value) => {
  if (value === 'pages' || value === 'spreads') mode.value = value
})

watch(mode, (value) => {
  if (documentViewMode.value !== value) {
    preferencesStore.SET_SINGLE_PREFERENCE({ type: 'documentViewMode', value })
  }
})

const markdown = computed(() => currentFile.value?.markdown ?? '')
const folioPages = computed(() => splitFolioPages(markdown.value))
const spreads = computed(() => buildSpreadPairs(folioPages.value))

const folioFor = (
  spread: { verso: string | null, recto: string | null },
  side: 'verso' | 'recto'
): number => {
  const pages = folioPages.value
  if (side === 'recto' && spread.verso == null) return 1
  const text = spread[side]
  if (text == null) return 0
  return pages.indexOf(text) + 1
}

const geometryStyle = computed(() => {
  const size = getBookPageSize(bookPageSize.value) ?? getBookPageSize('Trade')!
  const landscape = !!bookPageLandscape.value
  const width = landscape ? size.heightMm : size.widthMm
  const height = landscape ? size.widthMm : size.heightMm
  const ratio = pageAspectRatio(size.widthMm, size.heightMm, landscape)
  return {
    '--page-ratio': String(ratio),
    '--page-width-mm': `${width}`,
    '--m-top': `${bookMarginTopMm.value}mm`,
    '--m-right': `${bookMarginRightMm.value}mm`,
    '--m-bottom': `${bookMarginBottomMm.value}mm`,
    '--m-left': `${bookMarginLeftMm.value}mm`,
    '--type-face': bookTypeFace.value || 'Georgia, "Source Serif 4", serif',
    '--type-size': `${bookTypeSizePt.value}pt`,
    '--type-leading': String(bookTypeLeading.value),
    '--type-tracking': `${bookTypeTracking.value}em`,
    '--type-indent': `${bookTypeIndentEm.value}em`,
    '--type-measure': `${bookTypeMeasureCh.value}ch`
  }
})
</script>

<style scoped>
.pages-view {
  height: 100%;
  overflow: auto;
  background: var(--editorBgColor);
  padding: 1rem 1.5rem 2rem;
}
.pages-toolbar {
  display: flex;
  gap: 0.5rem;
  align-items: center;
  margin-bottom: 1rem;
  position: sticky;
  top: 0;
  z-index: 1;
  background: var(--editorBgColor);
  padding: 0.35rem 0;
}
.pages-toolbar button {
  border: 1px solid var(--floatBorderColor, #ccc);
  background: transparent;
  color: var(--editorColor);
  padding: 0.25rem 0.75rem;
  cursor: pointer;
}
.pages-toolbar button.active {
  border-color: var(--themeColor, #3d75dd);
  color: var(--themeColor, #3d75dd);
}
.hint {
  margin-left: auto;
  font-size: 0.8rem;
  opacity: 0.7;
  color: var(--editorColor);
}
.pages-stack,
.spreads-stack {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
  align-items: center;
}
.spread {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.75rem;
  width: min(56rem, 100%);
}
.page-card {
  position: relative;
  width: min(22rem, 100%);
  aspect-ratio: var(--page-ratio);
  background: #fff;
  color: #111;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.18);
  padding: var(--m-top) var(--m-right) var(--m-bottom) var(--m-left);
  box-sizing: border-box;
  overflow: hidden;
}
.spreads .page-card {
  width: auto;
}
.page-card.blank {
  background: #f3f3f3;
  box-shadow: none;
}
.folio {
  position: absolute;
  bottom: 0.4rem;
  font-size: 0.7rem;
  opacity: 0.55;
}
.verso .folio {
  left: 0.6rem;
}
.recto .folio,
.pages-stack .folio {
  right: 0.6rem;
}
.body {
  margin: 0;
  height: 100%;
  overflow: hidden;
  white-space: pre-wrap;
  word-break: break-word;
  font-family: var(--type-face);
  font-size: var(--type-size);
  line-height: var(--type-leading);
  letter-spacing: var(--type-tracking);
  max-width: var(--type-measure);
  text-indent: var(--type-indent);
}
</style>
