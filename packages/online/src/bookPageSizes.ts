/** Book trim presets (mm) — online pages defaults. */

export interface BookPageSize {
  id: string
  widthMm: number
  heightMm: number
}

export const BOOK_PAGE_SIZES: readonly BookPageSize[] = [
  { id: 'BFormat', widthMm: 128, heightMm: 198 },
  { id: 'A5', widthMm: 148, heightMm: 210 },
  { id: 'Trade', widthMm: 152.4, heightMm: 228.6 }
] as const

export const getBookPageSize = (id: string): BookPageSize | undefined =>
  BOOK_PAGE_SIZES.find((s) => s.id === id)
