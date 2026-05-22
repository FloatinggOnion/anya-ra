import type { Paper } from '../types/paper'
import type { CitationStyle, SidebarSuggestionItem } from '../types/suggestion'
import { get } from 'svelte/store'
import { settings } from '../stores/settings'

/**
 * Pool of framing phrases for contextual citations (D-06).
 * Rotated per paper ID to provide variety for repeated citations of the same paper.
 */
const FRAMING_PHRASES = [
  'As demonstrated by',
  'As noted by',
  'Building on work by',
  'As shown by',
  'According to',
  'As argued by',
  'In the work of',
  'As established by',
]

/** Track which framing phrase index each paper last used, for rotation */
const _paperFrameIndex = new Map<string, number>()

/** Get the next framing phrase for a given paper. Cycles through the pool. */
function getFramingText(paperId: string): string {
  const idx = _paperFrameIndex.get(paperId) ?? 0
  const phrase = FRAMING_PHRASES[idx % FRAMING_PHRASES.length]
  _paperFrameIndex.set(paperId, idx + 1)
  return phrase
}

/** Reset framing state. Exported for test isolation. */
export function _resetFramingState(): void {
  _paperFrameIndex.clear()
}

/**
 * Format author names for inline citation.
 * 1 author: "Smith"
 * 2 authors: "Smith and Jones"
 * 3+ authors: "Smith et al."
 * 0 authors: "Unknown"
 */
export function formatAuthorName(authors: string[]): string {
  if (authors.length === 0) return 'Unknown'
  const surnames = authors.map((a) => {
    const parts = a.trim().split(' ')
    return parts[parts.length - 1]
  })
  if (surnames.length === 1) return surnames[0]
  if (surnames.length === 2) return `${surnames[0]} and ${surnames[1]}`
  return `${surnames[0]} et al.`
}

/**
 * Format a paper citation according to the given style.
 * PER D-06: "inserts a contextual citation with surrounding framing text"
 */
export function formatPaperCitation(paper: Paper, style: CitationStyle): string {
  const authors = paper.authors
  const title = paper.title
  const year = paper.year
  const yearStr = year != null ? ` (${year})` : ''

  switch (style) {
    case 'author-year': {
      const authorStr = formatAuthorName(authors)
      const frame = getFramingText(paper.id)
      return `${frame} ${authorStr}${yearStr} [cite: ${title}], `
    }
    case 'cite-title': {
      return ` [cite: ${title}] `
    }
    case 'footnote': {
      const surnames = authors.map((a) => {
        const parts = a.trim().split(' ')
        return parts[parts.length - 1]
      })
      const authorStr =
        surnames.length === 0
          ? 'Unknown'
          : surnames.length <= 3
            ? surnames.join(', ')
            : `${surnames.slice(0, 3).join(', ')} et al.`
      return `${authorStr}${yearStr}, "${title}". `
    }
    default:
      return ` [cite: ${title}] `
  }
}

/**
 * Generate contextual citation text based on the configured citation style.
 * Used when user clicks a suggestion card in the sidebar.
 */
export function generateCitation(
  item: SidebarSuggestionItem,
  paper?: Paper | null,
): string {
  if (item.type === 'completion') return item.content + ' '
  if (item.type === 'idea') return ''

  if (item.type === 'paper') {
    const style = getCitationStyle()

    if (paper) return formatPaperCitation(paper, style)

    if (item.paper) {
      // Build minimal paper from item.paper data
      const p: Paper = {
        id: item.paper.id,
        source: 'local' as const,
        externalId: item.paper.id,
        title: item.paper.title,
        authors: item.paper.authors,
        year: item.paper.year,
        abstract: null,
        url: '',
        doi: null,
        arxivId: null,
        semanticId: null,
        isOpenAccess: false,
        openAccessStatus: null,
        pdfUrl: null,
        localPdfPath: null,
        pdfDownloaded: false,
        importedAt: new Date().toISOString(),
        addedAt: new Date().toISOString(),
        lastUpdated: new Date().toISOString(),
        tags: [],
      }
      return formatPaperCitation(p, style)
    }
  }

  return ''
}

/** Get the current citation style from the settings store */
export function getCitationStyle(): CitationStyle {
  return (get(settings).suggestions.citationStyle as CitationStyle) || 'author-year'
}
