// Slugs from getTOC are not stamped on the heading DOM. getTOC walks
// top-level headings in order, which are the direct children of .mu-container.
export const TOP_LEVEL_HEADINGS_SELECTOR =
  '.mu-container > h1, .mu-container > h2, .mu-container > h3, .mu-container > h4, .mu-container > h5, .mu-container > h6'

export function resolveTocHeading (container: Element, index: number): Element | null {
  const headings = container.querySelectorAll(TOP_LEVEL_HEADINGS_SELECTOR)
  return headings[index] ?? null
}
