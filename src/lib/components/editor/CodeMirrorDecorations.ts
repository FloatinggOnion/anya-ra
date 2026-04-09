/**
 * CodeMirror 6 decorations for citation validation feedback.
 *
 * Provides helpers to create red wavy underline for invalid citations.
 * Used by DocumentEditor to apply visual feedback in real-time.
 */

import { Decoration } from '@codemirror/view'
import type { LinkMetadata } from '../../types/document'

/**
 * Red wavy underline decoration for invalid citations.
 * CSS class is used for styling (not inline styles).
 */
const redUnderlineMark = Decoration.mark({
  class: 'citation-error',
  attributes: {
    title: 'Paper not found. Hover for suggestions.',
  },
})

/**
 * createRedUnderlineDecoration - Return a Decoration.mark() for red underline.
 *
 * Used to style invalid citations with red wavy underline + cursor: help.
 */
export function createRedUnderlineDecoration() {
  return redUnderlineMark
}

/**
 * createDecorationRanges - Convert LinkMetadata[] to CodeMirror Range<Decoration>[].
 *
 * For each invalid link (status='missing'), create a Range from position to position+length
 * with red underline decoration.
 *
 * Example:
 *   link = {citationText: "Unknown", position: 9, content: "[cite: Unknown]", status: "missing"}
 *   → Range(9, 24, redUnderlineDecoration)  // 24 = 9 + "[cite: Unknown]".length
 *
 * CodeMirror uses character offsets (not line:column), so we can use position directly.
 */
export function createDecorationRanges(links: LinkMetadata[], content: string) {
  const ranges: any[] = []

  for (const link of links) {
    // Only decorate invalid citations
    if (link.status === 'missing') {
      // Find the full citation text in content to get the end position
      const startPos = link.position
      // The full "[cite: ...]" is in link.content
      const endPos = startPos + (link.content?.length ?? 0)

      if (endPos > startPos) {  // Only add range if valid
        ranges.push(redUnderlineMark.range(startPos, endPos))
      }
    }
  }

  return ranges
}

/**
 * formatSuggestionsTooltip - Format suggestions for tooltip display.
 *
 * Input: array of Paper objects
 * Output: string like "Did you mean: Paper 1, Paper 2, Paper 3?"
 *
 * Used when creating hover tooltip for broken citations.
 */
export function formatSuggestionsTooltip(suggestions: any[]): string {
  if (suggestions.length === 0) {
    return 'Paper not found.'
  }

  const titles = suggestions.slice(0, 3).map(p => p.title).join(', ')
  return `Did you mean: ${titles}?`
}
