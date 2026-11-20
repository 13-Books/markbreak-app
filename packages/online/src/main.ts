import type { ISelectionChangePayload, ITocItem } from '@muyajs/core'
import {
  CodeBlockLanguageSelector,
  EmojiSelector,
  FootnoteTool,
  ImageEditTool,
  ImagePathPicker,
  ImageResizeBar,
  ImageToolBar,
  InlineFormatToolbar,
  en,
  LinkTools,
  Muya,
  ParagraphFrontButton,
  ParagraphFrontMenu,
  ParagraphQuickInsertMenu,
  PreviewToolBar,
  TableChessboard,
  TableColumnToolbar,
  TableDragBar,
  TableRowColumMenu
} from '@muyajs/core'
import { renderCsvHtml } from './csv'
import { renderMenu, type MenuEntry } from './menu'
import { loadPrefs, savePrefs } from './prefs'
import { clearRecent, loadRecent, rememberRecent } from './recent'
import { applyEditorWidth, applyTheme, themeNames, themes } from './themes'
import { mountPages, type PagesMode } from './pages'
import { expandSpineMarkdown } from './spine'
import { resolveTocHeading } from './toc'
import type { OnlineViewMode } from './prefs'

import './style.css'

const SPEC_URL = 'https://markbreak.com/specification.md'

const source = document.getElementById('source') as HTMLTextAreaElement
const csvView = document.getElementById('csv') as HTMLElement
const tocEl = document.getElementById('toc') as HTMLElement
const filenameEl = document.getElementById('filename') as HTMLElement
const wordsEl = document.getElementById('words') as HTMLElement
const urlInput = document.getElementById('url') as HTMLInputElement
const urlDialog = document.getElementById('urlDialog') as HTMLDialogElement
const fileInput = document.getElementById('file') as HTMLInputElement
const appMenu = document.getElementById('appMenu') as HTMLElement
const btnMenu = document.getElementById('btnMenu') as HTMLButtonElement
const toastEl = document.getElementById('toast') as HTMLElement
const fontSizeInput = document.getElementById('fontSize') as HTMLInputElement
const lineHeightInput = document.getElementById('lineHeight') as HTMLInputElement
const codeFontSizeInput = document.getElementById('codeFontSize') as HTMLInputElement
const editorWidthInput = document.getElementById('editorLineWidth') as HTMLInputElement
const themeSelect = document.getElementById('theme') as HTMLSelectElement
const prefsDialog = document.getElementById('prefsDialog') as HTMLDialogElement
const btnOutline = document.getElementById('btnOutline') as HTMLButtonElement
const outline = document.getElementById('outline') as HTMLElement
const outlineIconEl = document.getElementById('outline-icon')
if (!outlineIconEl) throw new Error('Missing outline icon')
const outlineIcon = outlineIconEl

const params = new URLSearchParams(location.search)
let loadedUrl = ''
let forcedMode: '' | 'markdown' | 'csv' | 'tsv' = ''
let hintPath = ''
let documentText = ''
/** Disk/share line ending; editor state always uses LF (same idea as MarkText #234). */
let lineEnding: 'lf' | 'crlf' = 'lf'
let tocItems: ITocItem[] = []
const prefs = loadPrefs(themeNames)
const requestedTheme = params.get('theme')
if (requestedTheme && themeNames.includes(requestedTheme)) {
  prefs.theme = requestedTheme
  savePrefs(prefs)
  params.delete('theme')
  const query = params.toString()
  history.replaceState(null, '', `${location.pathname}${query ? `?${query}` : ''}${location.hash}`)
}
applyTheme(prefs.theme)
applyEditorWidth(prefs.editorLineWidth)

let toastTimer = 0

function setStatus(msg: string, err = false): void {
  window.clearTimeout(toastTimer)
  if (!msg) {
    toastEl.hidden = true
    toastEl.textContent = ''
    toastEl.classList.remove('err')
    return
  }
  toastEl.textContent = msg
  toastEl.classList.toggle('err', err)
  toastEl.hidden = false
  // Errors linger; ordinary notes clear so the title bar stays quiet.
  toastTimer = window.setTimeout(() => {
    toastEl.hidden = true
    toastEl.textContent = ''
    toastEl.classList.remove('err')
  }, err ? 8000 : 3200)
}

function fileName(): string {
  const raw = (loadedUrl || hintPath || '').split(/[?#]/)[0]
  if (!raw) return 'Untitled'
  const base = raw.split('/').filter(Boolean).pop()
  if (!base) return 'Untitled'
  try {
    return decodeURIComponent(base)
  } catch {
    return base
  }
}

function showWords(text: string): void {
  const count = text.trim() ? text.trim().split(/\s+/).length : 0
  wordsEl.textContent = count === 1 ? '1 word' : count + ' words'
}

function extOf(path: string): string {
  const match = path.toLowerCase().match(/\.([a-z0-9]+)(?:\?|#|$)/)
  return match ? match[1] : ''
}

function resolveMode(): 'markdown' | 'csv' | 'tsv' {
  if (forcedMode) return forcedMode
  const ext = extOf(hintPath || loadedUrl)
  if (ext === 'csv') return 'csv'
  if (ext === 'tsv') return 'tsv'
  const q = params.get('lang') || params.get('language')
  if (q === 'csv' || q === 'tsv' || q === 'markdown') return q
  return 'markdown'
}

function tableMode(): boolean {
  const mode = resolveMode()
  return mode === 'csv' || mode === 'tsv'
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

function renderOutline(): void {
  if (tableMode()) {
    tocItems = []
    tocEl.innerHTML = '<p class="toc-empty">No headings</p>'
    return
  }
  tocItems = muya.getTOC()
  if (!tocItems.length) {
    tocEl.innerHTML = '<p class="toc-empty">No headings</p>'
    return
  }
  tocEl.innerHTML = tocItems.map((item, index) => {
    const level = Math.min(6, Math.max(1, item.lvl))
    return '<a class="l' + level + '" href="#toc-' + index + '" data-index="' + index + '">' + escapeHtml(item.content) + '</a>'
  }).join('')
}

function imagePathPicker(): Promise<string> {
  return new Promise((resolve) => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = 'image/*'
    let settled = false
    const finish = (value: string): void => {
      if (settled) return
      settled = true
      resolve(value)
    }
    input.addEventListener('change', () => {
      const file = input.files?.[0]
      if (!file) {
        finish('')
        return
      }
      const reader = new FileReader()
      reader.onload = () => finish(typeof reader.result === 'string' ? reader.result : '')
      reader.onerror = () => finish('')
      reader.readAsDataURL(file)
    })
    window.addEventListener('focus', () => {
      window.setTimeout(() => {
        if (!input.files?.length) finish('')
      }, 400)
    }, { once: true })
    input.click()
  })
}

Muya.use(TableChessboard)
Muya.use(ParagraphQuickInsertMenu)
Muya.use(CodeBlockLanguageSelector)
Muya.use(EmojiSelector)
Muya.use(ImagePathPicker)
Muya.use(ImageEditTool, {
  imagePathPicker,
  imageAction: async(state: { src: string }) => state.src
})
Muya.use(ImageResizeBar)
Muya.use(ImageToolBar)
Muya.use(InlineFormatToolbar)
Muya.use(ParagraphFrontButton)
Muya.use(ParagraphFrontMenu)
Muya.use(PreviewToolBar)
Muya.use(LinkTools, {
  jumpClick: (linkInfo: { href?: string | null } | null) => {
    const href = linkInfo?.href
    if (href && /^https?:\/\//.test(href)) window.open(href, '_blank', 'noopener,noreferrer')
  }
})
Muya.use(FootnoteTool)
Muya.use(TableColumnToolbar)
Muya.use(TableDragBar)
Muya.use(TableRowColumMenu)

const editorMount = document.getElementById('editor')
if (!editorMount) throw new Error('Missing editor mount')
const pagesMount = document.getElementById('pagesMount')
if (!pagesMount) throw new Error('Missing pages mount')

const pages = mountPages(pagesMount)

const muya = new Muya(editorMount, {
  markdown: '',
  frontMatter: true,
  fontSize: prefs.fontSize,
  lineHeight: prefs.lineHeight,
  codeFontSize: prefs.codeFontSize,
  codeFontFamily: '"Source Code Pro", "DejaVu Sans Mono", Consolas, monospace',
  focusMode: prefs.focus,
  hideQuickInsertHint: prefs.hideQuickInsertHint,
  autoPairBracket: prefs.autoPairBracket,
  autoPairMarkdownSyntax: prefs.autoPairMarkdownSyntax,
  autoPairQuote: prefs.autoPairQuote,
  codeBlockLineNumbers: prefs.codeBlockLineNumbers,
  wrapCodeBlocks: prefs.wrapCodeBlocks,
  trimUnnecessaryCodeBlockEmptyLines: prefs.trimCodeBlockEmptyLines,
  footnote: true
})
muya.locale(en)
muya.init()
muya.setFocusMode(prefs.focus)

function showTable(): void {
  const mode = resolveMode()
  const label = mode === 'tsv' ? 'TSV' : 'CSV'
  const delim = mode === 'tsv' ? '\t' : ','
  csvView.innerHTML = renderCsvHtml(documentText, delim, label)
  document.body.classList.add('is-table')
  renderOutline()
}

function showMarkdown(text: string): void {
  document.body.classList.remove('is-table')
  // Marked/Muya block lexing is LF-only; never hand it leftover CRs.
  muya.setContent(normalizeNewlines(text))
  renderOutline()
}

function normalizeNewlines(text: string): string {
  return text.replace(/\r\n?/g, '\n')
}

function detectLineEnding(text: string): 'lf' | 'crlf' {
  return /\r\n/.test(text) ? 'crlf' : 'lf'
}

function encodeForSave(text: string): string {
  const lf = normalizeNewlines(text)
  return lineEnding === 'crlf' ? lf.replace(/\n/g, '\r\n') : lf
}

function applyDocument(text: string): void {
  lineEnding = detectLineEnding(text)
  documentText = normalizeNewlines(text)
  filenameEl.textContent = fileName()
  showWords(documentText)
  if (document.body.classList.contains('is-source')) source.value = documentText
  if (tableMode()) showTable()
  else showMarkdown(documentText)
  pages.setMarkdown(documentText)
  rememberRecent({
    name: fileName(),
    url: loadedUrl || undefined,
    text: loadedUrl ? undefined : documentText
  })
}

function pagesModeFor(view: OnlineViewMode): PagesMode {
  if (view === 'pages') return 'pages'
  if (view === 'spreads') return 'spreads'
  return 'off'
}

function setViewMode(view: OnlineViewMode): void {
  prefs.viewMode = view
  const pagesOn = view === 'pages' || view === 'spreads'
  if (pagesOn && document.body.classList.contains('is-source')) setSource(false)
  document.body.classList.toggle('is-pages', pagesOn)
  pages.setMarkdown(documentText)
  pages.setMode(pagesModeFor(view))
  remember()
}

function remember(): void {
  savePrefs(prefs)
}

function syncToc(): void {
  const open = prefs.showToc
  document.documentElement.classList.toggle('hide-toc', !open)
  btnOutline.setAttribute('aria-expanded', open ? 'true' : 'false')
  btnOutline.setAttribute('aria-label', open ? 'Hide contents' : 'Show contents')
  outlineIcon.setAttribute('d', open ? 'm11 6-6 6 6 6m7-12-6 6 6 6' : 'M4 6h16M4 12h12M4 18h8')
  if (open) outline.classList.remove('is-suppressed')
}

function pushWritingOptions(rerender: boolean): void {
  muya.setOptions({
    fontSize: prefs.fontSize,
    lineHeight: prefs.lineHeight,
    codeFontSize: prefs.codeFontSize,
    hideQuickInsertHint: prefs.hideQuickInsertHint,
    autoPairBracket: prefs.autoPairBracket,
    autoPairMarkdownSyntax: prefs.autoPairMarkdownSyntax,
    autoPairQuote: prefs.autoPairQuote,
    codeBlockLineNumbers: prefs.codeBlockLineNumbers,
    wrapCodeBlocks: prefs.wrapCodeBlocks,
    trimUnnecessaryCodeBlockEmptyLines: prefs.trimCodeBlockEmptyLines
  }, rerender)
  applyTheme(prefs.theme)
  applyEditorWidth(prefs.editorLineWidth)
  remember()
}

muya.on('json-change', () => {
  if (tableMode() || document.body.classList.contains('is-source')) return
  documentText = muya.getMarkdown()
  showWords(documentText)
  renderOutline()
})

muya.on('selection-change', (changes: ISelectionChangePayload) => {
  if (!document.body.classList.contains('is-typewriter')) return
  const y = changes.selection?.context.cursorCoords?.y
  if (y == null) return
  const container = muya.domNode
  const top = container.getBoundingClientRect().top
  const next = container.scrollTop + y - top - container.clientHeight / 2
  if (Math.abs(container.scrollTop - next) > 2) container.scrollTop = next
})

fontSizeInput.value = String(prefs.fontSize)
lineHeightInput.value = String(prefs.lineHeight)
codeFontSizeInput.value = String(prefs.codeFontSize)
editorWidthInput.value = prefs.editorLineWidth
document.body.classList.toggle('is-typewriter', prefs.typewriter)
syncToc()

for (const group of [['Light', false], ['Dark', true]] as const) {
  const box = document.createElement('optgroup')
  box.label = group[0]
  for (const theme of themes.filter((item) => item.dark === group[1])) {
    const option = document.createElement('option')
    option.value = theme.name
    option.textContent = theme.label
    box.append(option)
  }
  themeSelect.append(box)
}
themeSelect.value = prefs.theme

const checks = [
  'hideQuickInsertHint',
  'codeBlockLineNumbers',
  'wrapCodeBlocks',
  'trimCodeBlockEmptyLines',
  'autoPairBracket',
  'autoPairMarkdownSyntax',
  'autoPairQuote'
] as const
for (const key of checks) {
  const input = document.getElementById(key) as HTMLInputElement
  input.checked = prefs[key]
  input.addEventListener('change', () => {
    prefs[key] = input.checked
    pushWritingOptions(key === 'codeBlockLineNumbers' || key === 'trimCodeBlockEmptyLines')
  })
}

fontSizeInput.addEventListener('change', () => {
  prefs.fontSize = Number(fontSizeInput.value)
  pushWritingOptions(false)
})
lineHeightInput.addEventListener('change', () => {
  prefs.lineHeight = Number(lineHeightInput.value)
  pushWritingOptions(false)
})
codeFontSizeInput.addEventListener('change', () => {
  prefs.codeFontSize = Number(codeFontSizeInput.value)
  pushWritingOptions(false)
})
editorWidthInput.addEventListener('change', () => {
  const value = editorWidthInput.value.trim()
  if (value && !/^[0-9]+(?:ch|px|%)$/.test(value)) {
    editorWidthInput.value = prefs.editorLineWidth
    return
  }
  prefs.editorLineWidth = value
  pushWritingOptions(false)
})
themeSelect.addEventListener('change', () => {
  prefs.theme = themeSelect.value
  pushWritingOptions(false)
})

btnOutline.addEventListener('click', () => {
  prefs.showToc = !prefs.showToc
  syncToc()
  remember()
  if (!prefs.showToc) {
    outline.classList.add('is-suppressed')
    btnOutline.blur()
  }
})
outline.addEventListener('pointerleave', () => {
  outline.classList.remove('is-suppressed')
})

function setSource(on: boolean): void {
  if (on === document.body.classList.contains('is-source')) return
  if (on) {
    source.value = tableMode() ? documentText : muya.getMarkdown()
    documentText = normalizeNewlines(source.value)
  } else {
    documentText = normalizeNewlines(source.value)
    if (tableMode()) showTable()
    else showMarkdown(documentText)
  }
  document.body.classList.toggle('is-source', on)
  if (on) source.focus()
}

function setFocus(on: boolean): void {
  prefs.focus = on
  muya.setFocusMode(on)
  remember()
}

function setTypewriter(on: boolean): void {
  prefs.typewriter = on
  document.body.classList.toggle('is-typewriter', on)
  remember()
}

function leaveSource(): void {
  if (!document.body.classList.contains('is-source')) return
  setSource(false)
}

source.addEventListener('input', () => {
  documentText = normalizeNewlines(source.value)
  showWords(documentText)
})

tocEl.addEventListener('click', (ev) => {
  const link = (ev.target as Element).closest('a')
  if (!link) return
  const index = Number(link.getAttribute('data-index'))
  ev.preventDefault()
  if (prefs.viewMode === 'pages' || prefs.viewMode === 'spreads') {
    pages.goToHeading(index)
    return
  }
  const target = resolveTocHeading(muya.domNode, index)
  if (!target) return
  leaveSource()
  target.scrollIntoView({ block: 'start' })
})

async function fetchTextCors(url: string): Promise<string> {
  const res = await fetch(url, { mode: 'cors' })
  if (!res.ok) throw new Error(res.status + ' ' + res.statusText + ' for ' + url)
  return res.text()
}

async function loadUrl(u: string): Promise<void> {
  if (!u) return
  loadedUrl = u
  hintPath = u
  setStatus('Loading ' + u + ' …')
  try {
    const root = await fetchTextCors(u)
    const expanded = await expandSpineMarkdown(root, u, fetchTextCors)
    applyDocument(expanded.markdown)
    setStatus(
      expanded.expanded
        ? 'Loaded ' + fileName() + ' · spine (' + expanded.files + ' files)'
        : 'Loaded ' + fileName() + ' · ' + resolveMode()
    )
    const next = new URL(location.href)
    next.searchParams.set('url', u)
    next.searchParams.delete('text')
    history.replaceState(null, '', next)
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    setStatus('Could not load URL (CORS or network): ' + message, true)
  }
}

document.getElementById('urlForm')?.addEventListener('submit', (event) => {
  event.preventDefault()
  const value = urlInput.value.trim()
  urlDialog.close()
  void loadUrl(value)
})
document.getElementById('urlCancel')?.addEventListener('click', () => {
  urlDialog.close()
})

fileInput.addEventListener('change', () => {
  const file = fileInput.files?.[0]
  fileInput.value = ''
  if (!file) return
  const reader = new FileReader()
  reader.onload = () => {
    loadedUrl = ''
    hintPath = file.name
    forcedMode = ''
    applyDocument(String(reader.result))
    setStatus('Opened ' + file.name)
    const next = new URL(location.href)
    next.searchParams.delete('url')
    next.searchParams.delete('text')
    history.replaceState(null, '', next.pathname + next.hash)
  }
  reader.readAsText(file)
})

function currentText(): string {
  return document.body.classList.contains('is-source') ? source.value : documentText
}

async function copyShareLink(): Promise<void> {
  const next = new URL(location.href)
  const mode = resolveMode()
  if (mode !== 'markdown') next.searchParams.set('lang', mode)
  else next.searchParams.delete('lang')
  if (loadedUrl) {
    next.searchParams.set('url', loadedUrl)
    next.searchParams.delete('text')
  } else {
    next.searchParams.delete('url')
    const raw = currentText()
    if (raw.length > 1800) {
      setStatus('Content too long for a share link. Save the file and open it by URL.', true)
      return
    }
    next.searchParams.set('text', raw)
  }
  try {
    await navigator.clipboard.writeText(next.toString())
    setStatus('Share link copied')
  } catch {
    setStatus(next.toString())
  }
}

async function saveFile(): Promise<void> {
  const name = fileName()
  const filename = name === 'Untitled' ? 'Untitled.md' : name
  const body = encodeForSave(currentText())
  const picker = window.showSaveFilePicker
  if (typeof picker === 'function') {
    try {
      const handle = await picker.call(window, {
        suggestedName: filename,
        types: [{
          description: 'Markdown',
          accept: { 'text/markdown': ['.md', '.markdown', '.txt'] }
        }]
      })
      const writable = await handle.createWritable()
      await writable.write(body)
      await writable.close()
      setStatus('Saved ' + (handle.name || filename))
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') return
      const message = error instanceof Error ? error.message : String(error)
      setStatus('Could not save: ' + message, true)
    }
    return
  }
  // Download fallback cannot detect Cancel in the browser dialog — do not claim Saved.
  const blob = new Blob([body], { type: 'text/markdown;charset=utf-8' })
  const link = document.createElement('a')
  link.href = URL.createObjectURL(blob)
  link.download = filename
  link.click()
  URL.revokeObjectURL(link.href)
  setStatus('Download started — ' + filename)
}

function newDocument(): void {
  loadedUrl = ''
  hintPath = ''
  forcedMode = ''
  applyDocument('')
  filenameEl.textContent = 'Untitled'
  const next = new URL(location.href)
  next.search = ''
  history.replaceState(null, '', next.pathname)
  setStatus('')
}

function openRecent(index: number): void {
  const doc = loadRecent()[index]
  if (!doc) return
  if (doc.url) {
    void loadUrl(doc.url)
    return
  }
  loadedUrl = ''
  hintPath = doc.name
  forcedMode = ''
  applyDocument(doc.text || '')
  setStatus('Opened ' + doc.name)
}

async function editCommand(command: 'undo' | 'redo' | 'cut' | 'copy' | 'paste' | 'selectAll'): Promise<void> {
  if (document.body.classList.contains('is-source')) {
    source.focus()
    if (command === 'selectAll') source.select()
    else if (command === 'paste') insertSource(await readClipboard())
    else document.execCommand(command)
    return
  }
  if (command === 'undo') muya.undo()
  else if (command === 'redo') muya.redo()
  else if (command === 'selectAll') muya.selectAll()
  else {
    muya.focus()
    if (command === 'paste') document.execCommand('insertText', false, await readClipboard())
    else document.execCommand(command)
  }
}

function insertSource(text: string): void {
  const start = source.selectionStart
  const end = source.selectionEnd
  source.setRangeText(text, start, end, 'end')
  source.dispatchEvent(new Event('input'))
}

async function readClipboard(): Promise<string> {
  try {
    return await navigator.clipboard.readText()
  } catch {
    return ''
  }
}

function menuEntries(): MenuEntry[] {
  const recent = loadRecent()
  const recentItems: MenuEntry[] = recent.length
    ? recent.map((doc, index) => ({ label: doc.name, action: 'recent:' + index }))
    : [{ label: 'No recent files', disabled: true }]
  recentItems.push(
    { label: '—', action: 'sep' },
    { label: 'Clear recent', action: 'clear-recent', disabled: recent.length === 0 }
  )
  const themeItems = (dark: boolean): MenuEntry[] => themes
    .filter((theme) => theme.dark === dark)
    .map((theme) => ({
      label: theme.label,
      action: 'theme:' + theme.name,
      checked: prefs.theme === theme.name
    }))
  return [
    {
      label: 'File',
      children: [
        { label: 'New', action: 'new', accel: 'Ctrl+N' },
        { label: 'Open File…', action: 'open-file', accel: 'Ctrl+O' },
        { label: 'Open Recent', children: recentItems },
        { label: 'Open URL…', action: 'open-url' },
        { label: '—', action: 'sep' },
        { label: 'Save', action: 'save', accel: 'Ctrl+S' },
        { label: 'Copy Link', action: 'share' },
        { label: '—', action: 'sep' },
        { label: 'Preferences', action: 'preferences' }
      ]
    },
    {
      label: 'Edit',
      children: [
        { label: 'Undo', action: 'undo', accel: 'Ctrl+Z' },
        { label: 'Redo', action: 'redo', accel: 'Ctrl+Shift+Z' },
        { label: '—', action: 'sep' },
        { label: 'Cut', action: 'cut', accel: 'Ctrl+X' },
        { label: 'Copy', action: 'copy', accel: 'Ctrl+C' },
        { label: 'Paste', action: 'paste', accel: 'Ctrl+V' },
        { label: 'Select All', action: 'select-all', accel: 'Ctrl+A' }
      ]
    },
    {
      label: 'Paragraph',
      children: [
        { label: 'Heading 1', action: 'p:heading 1' },
        { label: 'Heading 2', action: 'p:heading 2' },
        { label: 'Heading 3', action: 'p:heading 3' },
        { label: 'Heading 4', action: 'p:heading 4' },
        { label: 'Heading 5', action: 'p:heading 5' },
        { label: 'Heading 6', action: 'p:heading 6' },
        { label: '—', action: 'sep' },
        { label: 'Promote heading', action: 'p:upgrade heading' },
        { label: 'Demote heading', action: 'p:degrade heading' },
        { label: '—', action: 'sep' },
        { label: 'Table', action: 'p:table' },
        { label: 'Code block', action: 'p:pre' },
        { label: 'Quote', action: 'p:blockquote' },
        { label: 'Math block', action: 'p:mathblock' },
        { label: '—', action: 'sep' },
        { label: 'Ordered list', action: 'p:ol-order' },
        { label: 'Bullet list', action: 'p:ul-bullet' },
        { label: 'Task list', action: 'p:ul-task' },
        { label: '—', action: 'sep' },
        { label: 'Paragraph', action: 'p:paragraph' },
        { label: 'Horizontal rule', action: 'p:hr' },
        { label: 'Front matter', action: 'p:front-matter' }
      ]
    },
    {
      label: 'Format',
      children: [
        { label: 'Bold', action: 'f:strong', accel: 'Ctrl+B' },
        { label: 'Italic', action: 'f:em', accel: 'Ctrl+I' },
        { label: 'Underline', action: 'f:u' },
        { label: 'Strikethrough', action: 'f:del' },
        { label: 'Highlight', action: 'f:mark' },
        { label: 'Inline code', action: 'f:inline_code' },
        { label: 'Superscript', action: 'f:sup' },
        { label: 'Subscript', action: 'f:sub' },
        { label: 'Clear format', action: 'f:clear' }
      ]
    },
    {
      label: 'View',
      children: [
        { label: 'Editor', action: 'view-editor', checked: prefs.viewMode === 'editor' },
        { label: 'Pages', action: 'view-pages', checked: prefs.viewMode === 'pages' },
        { label: 'Spreads', action: 'view-spreads', checked: prefs.viewMode === 'spreads' },
        { label: '—', action: 'sep' },
        {
          label: 'Source',
          action: 'source',
          checked: document.body.classList.contains('is-source'),
          disabled: prefs.viewMode !== 'editor'
        },
        { label: 'Typewriter', action: 'typewriter', checked: prefs.typewriter },
        { label: 'Focus', action: 'focus', checked: prefs.focus },
        { label: '—', action: 'sep' },
        { label: 'Contents', action: 'contents', checked: prefs.showToc }
      ]
    },
    { label: 'Theme', children: [{ label: 'Light', children: themeItems(false) }, { label: 'Dark', children: themeItems(true) }] },
    {
      label: 'Help',
      children: [{ label: 'Read the specification', action: 'spec' }]
    }
  ]
}

function closeMenu(): void {
  appMenu.hidden = true
  btnMenu.setAttribute('aria-expanded', 'false')
}

function openMenu(): void {
  renderMenu(appMenu, menuEntries(), (action) => {
    closeMenu()
    void runAction(action)
  })
  appMenu.hidden = false
  btnMenu.setAttribute('aria-expanded', 'true')
  placeSubmenus()
}

function placeSubmenus(): void {
  const margin = 8
  appMenu.querySelectorAll<HTMLElement>('.submenu').forEach((panel) => {
    if (getComputedStyle(panel).display === 'none') return
    // Always fly out beside the row; only nudge up if the panel would clip the viewport.
    panel.style.top = '0'
    panel.style.left = ''
    panel.style.maxHeight = ''
    const rect = panel.getBoundingClientRect()
    const overflow = rect.bottom - (window.innerHeight - margin)
    if (overflow > 0) {
      const maxUp = rect.top - margin
      panel.style.top = `${-Math.min(overflow, Math.max(0, maxUp))}px`
    }
    if (panel.querySelector('.menu-branch')) return
    const placed = panel.getBoundingClientRect()
    const room = window.innerHeight - margin - Math.max(margin, placed.top)
    if (panel.scrollHeight > room) panel.style.maxHeight = `${Math.max(96, room)}px`
  })
}

async function runAction(action: string): Promise<void> {
  if (action.startsWith('recent:')) {
    openRecent(Number(action.slice('recent:'.length)))
    return
  }
  if (action.startsWith('theme:')) {
    prefs.theme = action.slice('theme:'.length)
    themeSelect.value = prefs.theme
    pushWritingOptions(false)
    return
  }
  if (action.startsWith('p:')) {
    if (tableMode()) return
    leaveSource()
    muya.focus()
    muya.updateParagraph(action.slice(2))
    return
  }
  if (action.startsWith('f:')) {
    if (tableMode()) return
    leaveSource()
    muya.focus()
    muya.format(action.slice(2))
    return
  }
  switch (action) {
    case 'new':
      newDocument()
      break
    case 'open-file':
      fileInput.click()
      break
    case 'open-url':
      forcedMode = ''
      urlDialog.showModal()
      urlInput.focus()
      break
    case 'save':
      void saveFile()
      break
    case 'share':
      await copyShareLink()
      break
    case 'preferences':
      if (!prefsDialog.open) prefsDialog.showModal()
      break
    case 'undo':
      await editCommand('undo')
      break
    case 'redo':
      await editCommand('redo')
      break
    case 'cut':
      await editCommand('cut')
      break
    case 'copy':
      await editCommand('copy')
      break
    case 'paste':
      await editCommand('paste')
      break
    case 'select-all':
      await editCommand('selectAll')
      break
    case 'view-editor':
      setViewMode('editor')
      break
    case 'view-pages':
      setViewMode('pages')
      break
    case 'view-spreads':
      setViewMode('spreads')
      break
    case 'source':
      if (prefs.viewMode !== 'editor') setViewMode('editor')
      setSource(!document.body.classList.contains('is-source'))
      break
    case 'typewriter':
      setTypewriter(!prefs.typewriter)
      break
    case 'focus':
      setFocus(!prefs.focus)
      break
    case 'contents':
      prefs.showToc = !prefs.showToc
      syncToc()
      remember()
      if (!prefs.showToc) outline.classList.add('is-suppressed')
      break
    case 'clear-recent':
      clearRecent()
      break
    case 'spec':
      hintPath = 'specification.md'
      forcedMode = 'markdown'
      await loadUrl(SPEC_URL)
      break
    default:
      break
  }
}

btnMenu.addEventListener('click', () => {
  if (appMenu.hidden) openMenu()
  else closeMenu()
})
appMenu.addEventListener('pointerover', () => placeSubmenus())
appMenu.addEventListener('focusin', () => placeSubmenus())
document.addEventListener('pointerdown', (event) => {
  if (appMenu.hidden) return
  const target = event.target
  if (target instanceof Node && (appMenu.contains(target) || btnMenu.contains(target))) return
  closeMenu()
})
document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape') closeMenu()
  if (!(event.ctrlKey || event.metaKey) || event.altKey) return
  const key = event.key.toLowerCase()
  if (key === 'o') {
    event.preventDefault()
    fileInput.click()
  } else if (key === 's') {
    event.preventDefault()
    void saveFile()
  } else if (key === 'n') {
    event.preventDefault()
    newDocument()
  }
})

void (async function boot() {
  const lang = params.get('lang') || params.get('language')
  if (lang === 'csv' || lang === 'tsv' || lang === 'markdown') forcedMode = lang
  renderOutline()
  if (params.get('url')) {
    await loadUrl(params.get('url') || '')
  } else if (params.has('text')) {
    hintPath = ''
    applyDocument(params.get('text') || '')
    setStatus('Loaded from ?text=')
  } else if (params.get('spec') === '1' || params.get('spec') === 'true') {
    await loadUrl(SPEC_URL)
  } else {
    setStatus('')
    filenameEl.textContent = 'Untitled'
  }
  if (prefs.viewMode !== 'editor') setViewMode(prefs.viewMode)
})()
