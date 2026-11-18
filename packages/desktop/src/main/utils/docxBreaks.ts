/**
 * Pre-pass on word/document.xml: turn Word break markers into sentinel
 * paragraphs that survive mammoth. Inverse of dialect/markbreak markbreak.lua
 * lines that emit column / page / oddPage / evenPage.
 */

const SENTINEL: Record<string, string> = {
  column: '//break',
  page: '//break page',
  odd: '//break odd',
  even: '//break even'
}

const textPara = (text: string): string =>
  `<w:p><w:r><w:t xml:space="preserve">${text}</w:t></w:r></w:p>`

/**
 * Replace break runs and odd/even section marks with sentinel paragraphs.
 * Leaves the final document sectPr (page size) alone.
 *
 * Paragraph matches must not span other paragraphs — a naive `[\s\S]*?<w:br`
 * would eat from the first `<w:p>` in the file to the first break.
 */
export const rewriteBreaksToSentinels = (documentXml: string): string => {
  let xml = documentXml

  // One paragraph at a time (no nested w:p).
  xml = xml.replace(/<w:p\b[^>]*>[\s\S]*?<\/w:p>/gi, (para) => {
    const br = /<w:br\b[^>]*\bw:type="(page|column)"[^/]*\/>/i.exec(para)
    if (br) {
      const type = br[1].toLowerCase()
      return textPara(SENTINEL[type] ?? SENTINEL.column)
    }
    const sect = /<w:sectPr\b[^>]*>[\s\S]*?<w:type\b[^>]*\bw:val="(oddPage|evenPage)"[^/]*\/>/i.exec(para)
    if (sect) {
      const val = sect[1].toLowerCase()
      return textPara(val === 'oddpage' ? SENTINEL.odd : SENTINEL.even)
    }
    return para
  })

  return xml
}

export const SENTINEL_BREAKS = SENTINEL
