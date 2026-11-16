export interface RecentDoc {
  name: string
  url?: string
  text?: string
}

const KEY = 'markbreak.online.recent'
const LIMIT = 8
const TEXT_LIMIT = 120_000

export function loadRecent(): RecentDoc[] {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as unknown
    if (!Array.isArray(parsed)) return []
    return parsed.filter(isDoc).slice(0, LIMIT)
  } catch {
    return []
  }
}

export function rememberRecent(doc: RecentDoc): void {
  const name = doc.name.trim()
  if (!name || name === 'Untitled') return
  const next: RecentDoc = { name }
  if (doc.url) next.url = doc.url
  else if (doc.text && doc.text.length <= TEXT_LIMIT) next.text = doc.text
  else return
  const list = loadRecent().filter((item) => item.name !== name || item.url !== next.url)
  list.unshift(next)
  localStorage.setItem(KEY, JSON.stringify(list.slice(0, LIMIT)))
}

export function clearRecent(): void {
  localStorage.removeItem(KEY)
}

function isDoc(value: unknown): value is RecentDoc {
  if (!value || typeof value !== 'object') return false
  const doc = value as RecentDoc
  return typeof doc.name === 'string' && (typeof doc.url === 'string' || typeof doc.text === 'string')
}
