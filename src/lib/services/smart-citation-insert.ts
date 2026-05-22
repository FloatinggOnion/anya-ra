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

/**
 * Retroactively reformat all existing [cite: ...] citations in a document
 * when the citation style changes (D-07).
 *
 * Scans document content for citation tags, looks up each paper by title,
 * and replaces the entire citation expression with the new style format.
 *
 * @param content - Full document text
 * @param papers - Available papers for title lookup
 * @param newStyle - Target citation style
 * @returns Reformatted document content with all citations updated
 */
export function reformatDocumentCitations(
  content: string,
  papers: Paper[],
  newStyle: CitationStyle,
): string {
  if (!content) return content

  let result = content

  // ─── Unified pass: collect all citation positions (both cite-tagged and bare footnotes) ──
  interface CitationMatch {
    start: number
    end: number
    paper: Paper
  }

  const replacements: CitationMatch[] = []

  // Find all [cite: Title] patterns
  const citeRegex = /(\[cite:\s*([^\]]+)\])/gi
  for (const match of result.matchAll(citeRegex)) {
    const fullCiteTag = match[1]
    const citedTitle = match[2].trim()
    const citeStart = match.index!
    const citeEnd = citeStart + fullCiteTag.length

    const paper = papers.find(
      (p) => p.title.toLowerCase() === citedTitle.toLowerCase(),
    )
    if (!paper) continue

    // Determine the citation expression to replace
    const textBefore = result.slice(0, citeStart)
    let replaceStart = citeStart

    // Check for author-year framing phrase backwards
    for (const phrase of FRAMING_PHRASES) {
      const phraseIdx = textBefore.lastIndexOf(phrase)
      if (phraseIdx >= 0) {
        const betweenPhraseAndCite = textBefore.slice(phraseIdx)
        if (!betweenPhraseAndCite.includes('[cite:')) {
          replaceStart = phraseIdx
          break
        }
      }
    }

    // Check for footnote pattern if no framing phrase found
    if (replaceStart === citeStart) {
      const beforeWindow = textBefore.slice(Math.max(0, citeStart - 200))
      const footnoteRegex = /([\w'-]+(?:,\s*[\w'-]+)*(?:\s+et\s+al\.)?\s*\(\d{4}\)\s*,\s*"[^"]+"\s*\.\s*)$/
      const footnoteMatch = beforeWindow.match(footnoteRegex)
      if (footnoteMatch) {
        const fStartInText = citeStart - beforeWindow.length + footnoteMatch.index!
        const between = textBefore.slice(fStartInText)
        if (between.indexOf('[cite:') === -1) {
          replaceStart = fStartInText
        }
      }
    }

    // Include trailing comma/space after cite tag
    let replaceEnd = citeEnd
    const afterCite = result.slice(citeEnd)
    const trailingMatch = afterCite.match(/^(,\s*|\s+)/)
    if (trailingMatch) {
      replaceEnd += trailingMatch[0].length
    }

    replacements.push({ start: replaceStart, end: replaceEnd, paper })
  }

  // Find bare footnote citations (without cite tags)
  const bareFootnoteRegex = /([\w'-]+(?:,\s*[\w'-]+)*(?:\s+et\s+al\.)?\s*\(\d{4}\)\s*,\s*"([^"]+)"\s*\.\s*)/g
  for (const match of result.matchAll(bareFootnoteRegex)) {
    const fullMatch = match[0]
    const citedTitle = match[2].trim()
    const matchStart = match.index!
    const matchEnd = matchStart + fullMatch.length

    // Skip if this footnote already has a nearby cite tag
    const nearbyText = result.slice(matchStart, matchStart + fullMatch.length + 50)
    if (nearbyText.includes('[cite:')) continue

    // Skip if this position overlaps with an existing replacement
    if (replacements.some((r) => r.start <= matchStart && r.end >= matchEnd)) continue

    const paper = papers.find(
      (p) => p.title.toLowerCase() === citedTitle.toLowerCase(),
    )
    if (!paper) continue

    replacements.push({ start: matchStart, end: matchEnd, paper })
  }

  // ─── Apply replacements in reverse order ──────────────────────────────────
  replacements.sort((a, b) => b.start - a.start) // Reverse by start position

  for (const { start, end, paper } of replacements) {
    _paperFrameIndex.delete(paper.id)
    const newCitation = formatPaperCitation(paper, newStyle)
    result = result.slice(0, start) + newCitation + result.slice(end)
  }

  return result
}
