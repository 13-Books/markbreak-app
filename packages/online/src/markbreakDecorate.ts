/** Live-editor chrome for MarkBreak dialect tokens (does not mutate json state). */

import { isFlowBreakLine } from './markbreakBreaks'

/**
 * Tag top-level paragraphs that are only a flow break so CSS can hide the
 * dialect line and show a quiet rule instead. Pages layout still reads the text.
 */
export function markFlowBreakParagraphs(root: ParentNode): void {
  for (const node of Array.from(root.querySelectorAll('.mu-container > p.mu-paragraph'))) {
    const el = node as HTMLElement
    const text = el.textContent ?? ''
    el.classList.toggle('mb-flow-break', isFlowBreakLine(text))
  }
}
