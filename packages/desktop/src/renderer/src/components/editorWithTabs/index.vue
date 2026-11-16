<template>
  <div
    class="editor-with-tabs"
    :style="{ 'max-width': `calc(100vw - ${effectiveSideBarWidth}px)`, '--editor-min-width': `${MIN_EDITOR_WIDTH}px` }"
  >
    <tabs v-show="showTabBar" />
    <div class="view-mode-bar">
      <button
        type="button"
        :class="{ active: viewMode === 'editor' }"
        @click="setViewMode('editor')"
      >
        {{ t('pagesView.editor') }}
      </button>
      <button
        type="button"
        :class="{ active: viewMode === 'source' || sourceCode }"
        @click="setViewMode('source')"
      >
        {{ t('pagesView.source') }}
      </button>
      <button
        type="button"
        :class="{ active: viewMode === 'pages' }"
        @click="setViewMode('pages')"
      >
        {{ t('pagesView.pages') }}
      </button>
      <button
        type="button"
        :class="{ active: viewMode === 'spreads' }"
        @click="setViewMode('spreads')"
      >
        {{ t('pagesView.spreads') }}
      </button>
    </div>
    <div class="container">
      <document-outline />
      <div class="document-body">
        <pages-view
          v-if="showPages"
        />
        <template v-else>
          <editor
            :markdown="markdown"
            :cursor="cursor"
            :text-direction="textDirection"
            :platform="platform"
          />
          <source-code
            v-if="sourceCode || viewMode === 'source'"
            :markdown="markdown"
            :muya-index-cursor="muyaIndexCursor"
            :text-direction="textDirection"
          />
        </template>
      </div>
    </div>
    <tab-notifications />
  </div>
</template>

<script setup lang="ts">
import { computed, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useLayoutStore } from '@/store/layout'
import { usePreferencesStore } from '@/store/preferences'
import { MIN_EDITOR_WIDTH } from '@/util/editorLayout'
import { storeToRefs } from 'pinia'
import DocumentOutline from './outline.vue'
import Tabs from './tabs.vue'
import Editor from './editor.vue'
import SourceCode from './sourceCode.vue'
import PagesView from './pagesView.vue'
import TabNotifications from './notifications.vue'

defineProps<{
  markdown: string
  // Tab cursor payloads cross the store boundary as unknown.
  cursor: unknown
  muyaIndexCursor?: unknown
  sourceCode: boolean
  showTabBar: boolean
  textDirection: string
  platform: string
}>()

const { t } = useI18n()
const { effectiveSideBarWidth } = storeToRefs(useLayoutStore())
const preferencesStore = usePreferencesStore()
const { documentViewMode, sourceCode: sourceCodePref } = storeToRefs(preferencesStore)

const viewMode = computed(() => documentViewMode.value)
const showPages = computed(() => viewMode.value === 'pages' || viewMode.value === 'spreads')

const setViewMode = (mode: 'editor' | 'source' | 'pages' | 'spreads') => {
  preferencesStore.SET_SINGLE_PREFERENCE({ type: 'documentViewMode', value: mode })
  if (mode === 'source' && !sourceCodePref.value) {
    preferencesStore.SET_SINGLE_PREFERENCE({ type: 'sourceCode', value: true })
  } else if (mode === 'editor' && sourceCodePref.value) {
    preferencesStore.SET_SINGLE_PREFERENCE({ type: 'sourceCode', value: false })
  }
}

watch(sourceCodePref, (isSource) => {
  if (isSource && viewMode.value === 'editor') {
    preferencesStore.SET_SINGLE_PREFERENCE({ type: 'documentViewMode', value: 'source' })
  } else if (!isSource && viewMode.value === 'source') {
    preferencesStore.SET_SINGLE_PREFERENCE({ type: 'documentViewMode', value: 'editor' })
  }
})
</script>

<style scoped>
.editor-with-tabs {
  position: relative;
  height: 100%;
  flex: 1;
  min-width: 0;
  container-type: inline-size;
  display: flex;
  flex-direction: column;

  overflow: hidden;
  background: var(--editorBgColor);
  & > .container {
    display: flex;
    position: relative;
    min-height: 0;
    flex: 1;
    overflow-x: auto;
    overflow-y: hidden;
  }
}
.view-mode-bar {
  display: flex;
  gap: 0.35rem;
  padding: 0.35rem 0.75rem;
  border-bottom: 1px solid var(--editorAreaBorderColor, rgba(0, 0, 0, 0.08));
  flex-shrink: 0;
}
.view-mode-bar button {
  border: 1px solid transparent;
  background: transparent;
  color: var(--editorColor);
  padding: 0.2rem 0.65rem;
  cursor: pointer;
  font-size: 0.85rem;
}
.view-mode-bar button.active {
  border-color: var(--themeColor, #3d75dd);
  color: var(--themeColor, #3d75dd);
}
.document-body {
  flex: 1;
  min-width: var(--editor-min-width);
  container-type: inline-size;
  height: 100%;
  overflow: hidden;
}
.container:has(.is-resizing) {
  cursor: col-resize;
  user-select: none;
}
</style>
