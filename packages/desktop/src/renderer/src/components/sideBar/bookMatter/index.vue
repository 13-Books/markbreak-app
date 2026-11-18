<template>
  <div class="book-matter">
    <h3 class="title">
      Book
    </h3>
    <label class="field">
      <span>Role</span>
      <select
        :value="matter.role || ''"
        @change="onRole"
      >
        <option value="">
          (none)
        </option>
        <option
          v-for="role in roles"
          :key="role"
          :value="role"
        >
          {{ role }}
        </option>
      </select>
    </label>
    <label class="field">
      <span>meta</span>
      <input
        type="text"
        :value="matter.meta || ''"
        placeholder="meta.md"
        @change="onMeta"
      >
    </label>
    <label class="field">
      <span>layout</span>
      <input
        type="text"
        :value="matter.layout || ''"
        placeholder="layout.rig.json"
        @change="onLayout"
      >
    </label>
    <label class="field">
      <span>stylesheet</span>
      <input
        type="text"
        :value="matter.stylesheet || 'book.css'"
        placeholder="book.css"
        @change="onStylesheet"
      >
    </label>
    <p
      v-if="pageCountHint"
      class="hint"
    >
      {{ pageCountHint }}
    </p>
    <p
      v-if="ppiWarnings.length"
      class="warn"
    >
      {{ ppiWarnings.join(' · ') }}
    </p>
    <div class="actions">
      <button
        type="button"
        @click="printProof"
      >
        Print proof
      </button>
      <button
        type="button"
        @click="openInRelay"
      >
        Open in Relay
      </button>
      <button
        type="button"
        :disabled="!sentFolder"
        @click="updateRelay"
      >
        Update Relay
      </button>
    </div>
    <p
      v-if="sentFolder"
      class="hint sent"
    >
      Sent to Relay: {{ sentFolder }}
    </p>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { useEditorStore } from '@/store/editor'
import bus from '@/bus'
import {
  MARKBREAK_ROLES,
  applyBookFrontMatter,
  parseBookFrontMatter
} from 'common/bookFrontMatter'
import { splitFolioPages } from 'common/markbreakBreaks'
import { isLowPrintPpi } from 'common/imagePpi'

const editorStore = useEditorStore()
const { currentFile } = storeToRefs(editorStore)
const roles = MARKBREAK_ROLES
const sentFolder = ref<string | null>(null)

const matter = computed(() => parseBookFrontMatter(currentFile.value?.markdown ?? ''))

const pageCountHint = computed(() => {
  const pages = splitFolioPages(currentFile.value?.markdown ?? '')
  const n = pages.length
  if (n % 4 === 0) return `${n} pages (signature-friendly)`
  return `${n} pages — not a multiple of 4`
})

const ppiWarnings = computed(() => {
  const md = currentFile.value?.markdown ?? ''
  const warnings: string[] = []
  const re = /!\[[^\]]*\]\(([^)\s]+)(?:\s+"[^"]*")?\)(?:\{[^}]*width=(\d+)[^}]*\})?/g
  let m: RegExpExecArray | null
  while ((m = re.exec(md)) !== null) {
    const widthAttr = m[2] ? Number(m[2]) : 0
    if (widthAttr > 0 && isLowPrintPpi(widthAttr, 100)) {
      warnings.push(`Low print ppi: ${m[1]}`)
    }
  }
  return warnings
})

const patch = (partial: Parameters<typeof applyBookFrontMatter>[1]) => {
  const file = currentFile.value
  if (!file) return
  const next = applyBookFrontMatter(file.markdown ?? '', partial)
  file.markdown = next
  bus.emit('file-changed', {
    id: file.id,
    markdown: next,
    cursor: file.cursor,
    renderCursor: false,
    history: file.history,
    scrollTop: file.scrollTop
  })
}

const onRole = (e: Event) => {
  patch({ role: (e.target as HTMLSelectElement).value || undefined })
}
const onMeta = (e: Event) => {
  patch({ meta: (e.target as HTMLInputElement).value.trim() || undefined })
}
const onLayout = (e: Event) => {
  patch({ layout: (e.target as HTMLInputElement).value.trim() || undefined })
}
const onStylesheet = (e: Event) => {
  const v = (e.target as HTMLInputElement).value.trim()
  patch({ stylesheet: v && v !== 'book.css' ? v : undefined })
}

const printProof = () => {
  // Pages/Spreads already carry layout + book.css; print uses the current view.
  bus.emit('showExportDialog', 'print')
}

const openInRelay = () => {
  const file = currentFile.value
  if (!file?.pathname) return
  window.electron.ipcRenderer.invoke('mt::relay-handoff', {
    markdown: file.markdown,
    pathname: file.pathname,
    open: true
  }).then((result) => {
    if (result?.folder) sentFolder.value = result.folder
  }).catch((err: unknown) => {
    window.electron.ipcRenderer.send('mt::show-notification', {
      title: 'Open in Relay',
      type: 'error',
      message: String(err)
    })
  })
}

const updateRelay = () => {
  const file = currentFile.value
  if (!file?.pathname || !sentFolder.value) return
  window.electron.ipcRenderer.invoke('mt::relay-handoff-update', {
    markdown: file.markdown,
    pathname: file.pathname,
    folder: sentFolder.value
  }).catch((err: unknown) => {
    window.electron.ipcRenderer.send('mt::show-notification', {
      title: 'Update Relay',
      type: 'error',
      message: String(err)
    })
  })
}

watch(
  () => currentFile.value?.id,
  () => { sentFolder.value = null }
)
</script>

<style scoped>
.book-matter {
  padding: 12px 14px;
  font-size: 13px;
}
.title {
  margin: 0 0 10px;
  font-size: 14px;
  font-weight: 600;
}
.field {
  display: flex;
  flex-direction: column;
  gap: 4px;
  margin-bottom: 10px;
}
.field span {
  opacity: 0.7;
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}
.field input,
.field select {
  padding: 4px 6px;
  border: 1px solid var(--floatBorderColor, #ccc);
  border-radius: 4px;
  background: var(--editorBgColor, #fff);
  color: inherit;
}
.hint {
  margin: 8px 0;
  opacity: 0.75;
  font-size: 12px;
}
.hint.sent {
  word-break: break-all;
}
.warn {
  margin: 8px 0;
  color: #a65;
  font-size: 12px;
}
.actions {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-top: 12px;
}
.actions button {
  padding: 6px 8px;
  border-radius: 4px;
  border: 1px solid var(--floatBorderColor, #ccc);
  background: var(--buttonBgColor, #f4f4f4);
  cursor: pointer;
}
.actions button:disabled {
  opacity: 0.45;
  cursor: default;
}
</style>
