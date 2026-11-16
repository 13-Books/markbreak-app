/** Book trim presets shared by the page view and export dialog (mm). */

export interface BookPageSize {
  id: string
  /** Electron / printToPDF named size when available */
  electronName?: string
  widthMm: number
  heightMm: number
}

export const BOOK_PAGE_SIZES: readonly BookPageSize[] = [
  { id: 'A5', electronName: 'A5', widthMm: 148, heightMm: 210 },
  { id: 'A4', electronName: 'A4', widthMm: 210, heightMm: 297 },
  { id: 'Letter', electronName: 'Letter', widthMm: 216, heightMm: 279 },
  { id: 'Legal', electronName: 'Legal', widthMm: 216, heightMm: 356 },
  { id: 'Tabloid', electronName: 'Tabloid', widthMm: 279, heightMm: 432 },
  { id: 'A3', electronName: 'A3', widthMm: 297, heightMm: 420 },
  /** Trade paperback 6×9 in */
  { id: 'Trade', widthMm: 152.4, heightMm: 228.6 },
  /** Mass-market paperback ~4.25×6.87 in */
  { id: 'MassMarket', widthMm: 107.95, heightMm: 174.5 }
] as const

export type BookPageSizeId = (typeof BOOK_PAGE_SIZES)[number]['id'] | 'custom'

export const getBookPageSize = (id: string): BookPageSize | undefined =>
  BOOK_PAGE_SIZES.find((s) => s.id === id)

export const pageAspectRatio = (
  widthMm: number,
  heightMm: number,
  landscape: boolean
): number => (landscape ? heightMm / widthMm : widthMm / heightMm)
