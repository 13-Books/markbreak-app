import type { UserPreferences } from '@shared/types/preferences'
import { useEditorStore } from './editor'
import { defineStore } from 'pinia'
import bus from '../bus'
import { setLanguage } from '../i18n'

export type EndOfLine = 'default' | 'lf' | 'crlf'
export type TitleBarStyle = 'custom' | 'native'
export type TextDirection = 'ltr' | 'rtl'
export type BulletListMarker = '*' | '+' | '-'
export type OrderListDelimiter = '.' | ')'
export type PreferHeadingStyle = 'atx' | 'setext'
export type FrontmatterType = '-' | ';' | '{' | '+'
export type SequenceTheme = 'hand' | 'simple'
export type ImageInsertAction = 'folder' | 'path' | 'upload'
export type ImageRelativeDirectoryBase = 'file' | 'root'
export type FileSortBy = 'created' | 'modified' | 'title'
export type FileSortOrder = 'asc' | 'desc'

export interface PreferencesState {
  autoSave: boolean
  autoSaveDelay: number
  titleBarStyle: TitleBarStyle | string
  openFilesInNewWindow: boolean
  openFolderInNewWindow: boolean
  zoom: number
  hideScrollbar: boolean
  wordWrapInToc: boolean
  tocPosition: 'left' | 'right'
  fileSortBy: FileSortBy | string
  fileSortOrder: FileSortOrder | string
  defaultOpenMode: 'edit' | 'read'
  startUpAction: UserPreferences['startUpAction']
  restoreLayoutState: boolean
  defaultDirectoryToOpen: string
  treePathExcludePatterns: string[]
  language: string
  showPandocConvert: boolean

  editorFontFamily: string
  fontSize: number
  lineHeight: number
  codeFontSize: number
  codeFontFamily: string
  codeBlockLineNumbers: boolean
  sourceCodeLineNumbers: boolean
  trimUnnecessaryCodeBlockEmptyLines: boolean
  wrapCodeBlocks: boolean
  editorLineWidth: string
  documentViewMode: 'editor' | 'source' | 'pages' | 'spreads'
  bookPageSize: string
  bookPageLandscape: boolean
  bookMarginTopMm: number
  bookMarginRightMm: number
  bookMarginBottomMm: number
  bookMarginLeftMm: number
  bookTypeFace: string
  bookTypeSizePt: number
  bookTypeLeading: number
  bookTypeTracking: number
  bookTypeIndentEm: number
  bookTypeMeasureCh: number

  autoPairBracket: boolean
  autoPairMarkdownSyntax: boolean
  autoPairQuote: boolean
  endOfLine: EndOfLine | string
  defaultEncoding: string
  autoGuessEncoding: boolean
  autoNormalizeLineEndings: boolean

  trimTrailingNewline: number
  textDirection: TextDirection | string
  hideQuickInsertHint: boolean
  imageInsertAction: ImageInsertAction | string
  imagePreferRelativeDirectory: boolean
  imageRelativeDirectoryBase: ImageRelativeDirectoryBase | string
  imageRelativeDirectoryName: string
  hideLinkPopup: boolean
  autoCheck: boolean

  preferLooseListItem: boolean
  bulletListMarker: BulletListMarker | string
  orderListDelimiter: OrderListDelimiter | string
  preferHeadingStyle: PreferHeadingStyle | string
  tabSize: number | 'tab'
  listIndentation: number
  frontmatterType: FrontmatterType | string
  cjkEmphasis: boolean
  superSubScript: boolean
  footnote: boolean
  texMathDollars: boolean
  texMathGfm: boolean
  texMathSingleBackslash: boolean
  texMathDoubleBackslash: boolean
  fancyLists: boolean
  highlightSyntax: boolean
  inlineDiff: boolean
  multilineBlockquote: boolean
  githubAlerts: boolean
  isHtmlEnabled: boolean
  softNewlineAsSpace: boolean
  sequenceTheme: SequenceTheme | string
  mermaidLightTheme: string
  mermaidDarkTheme: string
  plantumlServer: string

  theme: string
  followSystemTheme: boolean
  lightModeTheme: string
  darkModeTheme: string
  customCss: string

  spellcheckerEnabled: boolean
  spellcheckerNoUnderline: boolean
  spellcheckerLanguage: string

  sourceCodeModeEnabled: boolean
  openedFilesInSidebar: boolean
  autoRevealInSidebar: boolean
  openFilesInPreviewMode: boolean

  searchExclusions: string[]
  searchMaxFileSize: string
  searchIncludeHidden: boolean
  searchNoIgnore: boolean
  searchFollowSymlinks: boolean

  watcherUsePolling: boolean

  typewriter: boolean
  focus: boolean
  sourceCode: boolean

  imageFolderPath: string
  webImages: unknown[]
  cloudImages: unknown[]
  currentUploader: string
  cliScript: string
}

interface SingleSetPreferencePayload {
  type: keyof PreferencesState | string
  value: unknown
}

interface SetUserDataPayload {
  type: string
  value: unknown
}

interface ModeTogglePayload {
  type: keyof PreferencesState | 'typewriter' | 'focus' | 'sourceCode'
  checked: boolean
}

export const usePreferencesStore = defineStore('preferences', {
  state: (): PreferencesState => ({
    autoSave: false,
    autoSaveDelay: 5000,
    titleBarStyle: 'custom',
    openFilesInNewWindow: false,
    openFolderInNewWindow: false,
    zoom: 1.0,
    hideScrollbar: false,
    wordWrapInToc: false,
    tocPosition: 'left',
    fileSortBy: 'created',
    fileSortOrder: 'asc',
    defaultOpenMode: 'edit',
    startUpAction: 'restoreAll',
    restoreLayoutState: true,
    defaultDirectoryToOpen: '',
    treePathExcludePatterns: [],
    language: 'en',
    showPandocConvert: false,

    editorFontFamily: 'Open Sans',
    fontSize: 16,
    lineHeight: 1.6,
    codeFontSize: 14,
    codeFontFamily: 'DejaVu Sans Mono',
    codeBlockLineNumbers: false,
    sourceCodeLineNumbers: true,
    trimUnnecessaryCodeBlockEmptyLines: true,
    wrapCodeBlocks: false,
    editorLineWidth: '',
    documentViewMode: 'editor',
    bookPageSize: 'BFormat',
    bookPageLandscape: false,
    bookMarginTopMm: 10,
    bookMarginRightMm: 12.5,
    bookMarginBottomMm: 15,
    bookMarginLeftMm: 12.5,
    bookTypeFace: 'Georgia, "Source Serif 4", serif',
    bookTypeSizePt: 11,
    bookTypeLeading: 1.4,
    bookTypeTracking: 0,
    bookTypeIndentEm: 0,
    bookTypeMeasureCh: 65,

    autoPairBracket: true,
    autoPairMarkdownSyntax: true,
    autoPairQuote: true,
    endOfLine: 'default',
    defaultEncoding: 'utf8',
    autoGuessEncoding: true,
    autoNormalizeLineEndings: false,

    trimTrailingNewline: 2,
    textDirection: 'ltr',
    hideQuickInsertHint: false,
    imageInsertAction: 'folder',
    imagePreferRelativeDirectory: false,
    imageRelativeDirectoryBase: 'file',
    imageRelativeDirectoryName: 'assets',
    hideLinkPopup: false,
    autoCheck: false,

    preferLooseListItem: true,
    bulletListMarker: '-',
    orderListDelimiter: '.',
    preferHeadingStyle: 'atx',
    tabSize: 4,
    listIndentation: 1,
    frontmatterType: '-',
    cjkEmphasis: true,
    superSubScript: false,
    footnote: false,
    texMathDollars: true,
    texMathGfm: false,
    texMathSingleBackslash: false,
    texMathDoubleBackslash: false,
    fancyLists: false,
    highlightSyntax: false,
    inlineDiff: false,
    multilineBlockquote: false,
    githubAlerts: false,
    isHtmlEnabled: true,
    softNewlineAsSpace: false,
    sequenceTheme: 'hand',
    mermaidLightTheme: 'default',
    mermaidDarkTheme: 'dark',
    plantumlServer: 'https://www.plantuml.com/plantuml',

    theme: 'light',
    followSystemTheme: true,
    lightModeTheme: 'light',
    darkModeTheme: 'dark',
    customCss: '',

    spellcheckerEnabled: false,
    spellcheckerNoUnderline: false,
    spellcheckerLanguage: 'en-US',

    sourceCodeModeEnabled: false,
    openedFilesInSidebar: true,
    autoRevealInSidebar: true,
    openFilesInPreviewMode: true,

    searchExclusions: [],
    searchMaxFileSize: '',
    searchIncludeHidden: false,
    searchNoIgnore: false,
    searchFollowSymlinks: true,

    watcherUsePolling: false,

    // Edit modes of the current window (not part of persistent settings)
    typewriter: false, // typewriter mode
    focus: false,
    sourceCode: false, // source code mode

    imageFolderPath: '',
    webImages: [],
    cloudImages: [],
    currentUploader: 'picgo',
    cliScript: ''
  }),

  getters: {
    getAll: (state): PreferencesState => state
  },

  actions: {
    SET_USER_PREFERENCE(preference: Partial<PreferencesState> | Record<string, unknown>): void {
      const oldLanguage = this.language

      Object.keys(preference).forEach((key) => {
        const incoming = (preference as Record<string, unknown>)[key]
        if (
          typeof incoming !== 'undefined' &&
          typeof (this as unknown as Record<string, unknown>)[key] !== 'undefined'
        ) {
          ;(this as unknown as Record<string, unknown>)[key] = incoming
        }
      })

      const lang = (preference as { language?: string }).language
      if (lang && lang !== oldLanguage) {
        setLanguage(lang)
      }
    },

    SET_MODE({ type, checked }: ModeTogglePayload): void {
      ;(this as unknown as Record<string, unknown>)[type as string] = checked
    },

    TOGGLE_VIEW_MODE(entryName: keyof PreferencesState | string): void {
      if (
        (useEditorStore().currentFile?.readOnly || useEditorStore().currentFile?.modeChanging) &&
        ['sourceCode', 'typewriter', 'focus'].includes(entryName)
      )
        return
      const target = this as unknown as Record<string, unknown>
      target[entryName as string] = !target[entryName as string]
    },

    ASK_FOR_USER_PREFERENCE(): void {
      window.electron.ipcRenderer.send('mt::ask-for-user-preference')
      window.electron.ipcRenderer.send('mt::ask-for-user-data')

      window.electron.ipcRenderer.on('mt::user-preference', (_e, preferences) => {
        this.SET_USER_PREFERENCE(preferences as Partial<PreferencesState>)
      })
    },

    SET_SINGLE_PREFERENCE({ type, value }: SingleSetPreferencePayload): void {
      ;(this as unknown as Record<string, unknown>)[type as string] = value

      if (type === 'language' && typeof value === 'string') {
        setLanguage(value)
      }

      window.electron.ipcRenderer.send('mt::set-user-preference', { [type as string]: value })
    },

    SET_USER_DATA({ type, value }: SetUserDataPayload): void {
      window.electron.ipcRenderer.send('mt::set-user-data', { [type]: value })
    },

    SET_IMAGE_FOLDER_PATH(value?: string): void {
      window.electron.ipcRenderer.send('mt::ask-for-modify-image-folder-path', value)
    },

    SET_DOCUMENT_VIEW_MODE(mode: 'editor' | 'source' | 'pages' | 'spreads'): void {
      if (mode === 'pages' || mode === 'spreads') {
        // Same guard as source mode / save: flush rAF-batched Muya edits into
        // the tab before Pages snapshots `currentFile.markdown`.
        useEditorStore().flushActiveEditor()
      }
      const sourceCode = mode === 'source'
      this.SET_SINGLE_PREFERENCE({ type: 'documentViewMode', value: mode })
      if (this.sourceCode !== sourceCode) {
        this.SET_SINGLE_PREFERENCE({ type: 'sourceCode', value: sourceCode })
      }
      this.DISPATCH_EDITOR_VIEW_STATE({
        documentViewMode: mode,
        sourceCode
      })
    },

    TOGGLE_DOCUMENT_VIEW_MODE(mode: 'pages' | 'spreads'): void {
      this.SET_DOCUMENT_VIEW_MODE(this.documentViewMode === mode ? 'editor' : mode)
    },

    CYCLE_DOCUMENT_VIEW_MODE(): void {
      const order = ['editor', 'source', 'pages', 'spreads'] as const
      const index = order.indexOf(this.documentViewMode)
      let next = order[(index < 0 ? 0 : index + 1) % order.length]
      const editor = useEditorStore()
      // Source is unavailable in Reading Mode — same guard as the Source menu item.
      if (
        next === 'source' &&
        (editor.currentFile?.readOnly || editor.currentFile?.modeChanging)
      ) {
        next = 'pages'
      }
      this.SET_DOCUMENT_VIEW_MODE(next)
    },

    LISTEN_FOR_VIEW(): void {
      window.electron.ipcRenderer.on('mt::show-command-palette', () => {
        bus.emit('show-command-palette')
      })
      window.electron.ipcRenderer.on('mt::toggle-view-mode-entry', (_event, entryName) => {
        if (entryName === 'sourceCode') {
          const editor = useEditorStore()
          if (editor.currentFile?.readOnly || editor.currentFile?.modeChanging) return
          this.SET_DOCUMENT_VIEW_MODE(this.documentViewMode === 'source' ? 'editor' : 'source')
          return
        }
        this.TOGGLE_VIEW_MODE(entryName)
        const target = this as unknown as Record<string, unknown>
        this.DISPATCH_EDITOR_VIEW_STATE({ [entryName]: target[entryName] })
      })
      window.electron.ipcRenderer.on(
        'mt::toggle-document-view-mode',
        (_event, mode: 'pages' | 'spreads') => {
          this.TOGGLE_DOCUMENT_VIEW_MODE(mode)
        }
      )
      window.electron.ipcRenderer.on('mt::cycle-document-view-mode', () => {
        this.CYCLE_DOCUMENT_VIEW_MODE()
      })
    },

    // Notify main so native menus use the updated preferences.
    LISTEN_TOGGLE_VIEW(): void {
      bus.on('view:toggle-view-entry', (entryName) => {
        const name = entryName as string
        if (name === 'sourceCode') {
          const editor = useEditorStore()
          if (editor.currentFile?.readOnly || editor.currentFile?.modeChanging) return
          this.SET_DOCUMENT_VIEW_MODE(this.documentViewMode === 'source' ? 'editor' : 'source')
          return
        }
        this.TOGGLE_VIEW_MODE(name)
        const target = this as unknown as Record<string, unknown>
        this.DISPATCH_EDITOR_VIEW_STATE({ [name]: target[name] })
      })
      bus.on('view:toggle-document-view', (mode) => {
        this.TOGGLE_DOCUMENT_VIEW_MODE(mode as 'pages' | 'spreads')
      })
      bus.on('view:cycle-document-view', () => {
        this.CYCLE_DOCUMENT_VIEW_MODE()
      })
    },

    DISPATCH_EDITOR_VIEW_STATE(viewState: Record<string, unknown>): void {
      const { windowId } = window.marktext?.env ?? { windowId: -1 }
      window.electron.ipcRenderer.send('mt::view-layout-changed', windowId, viewState)
    }
  }
})
