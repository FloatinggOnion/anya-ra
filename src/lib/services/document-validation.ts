/**
 * Citation validation service for document linking.
 *
 * Parses [cite: ...] syntax, validates against papers store, and fuzzy matches
 * to find paper IDs. Also generates decorations for CodeMirror.
 */

import type { Paper } from '../types/paper'
import type { LinkMetadata } from '../types/document'

/**
 * Citation — represents a parsed citation from document content.
 * Position is character offset; content is full "[cite: ...]" text.
 */
export interface Citation {
  citationText: string  // Text between "[cite: " and "]"
  position: number      // Character offset in document (start of "[")
  content: string       // Full "[cite: ...]" text
}

/**
 * parseCitations - Extract all [cite: ...] patterns from document content.
 *
 * Regex: \[cite:\s*([^\]]+)\] matches "[cite: Paper Title]"
 * Returns array of parsed citations with positions.
 *
 * Example:
 *   "As noted [cite: Attention Is All You Need], transformers..."
 *   → [{citationText: "Attention Is All You Need", position: 9, content: "[cite: Attention Is All You Need]"}]
 */
export function parseCitations(content: string): Citation[] {
  const citations: Citation[] = []
  const regex = /\[cite:\s*([^\]]+)\]/g
  let match

  while ((match = regex.exec(content)) !== null) {
    const citationText = match[1].trim()
    citations.push({
      citationText,
      position: match.index,
      content: match[0],
    })
  }

  return citations
}

/**
 * Simple fuzzy matcher for paper titles.
 * Returns true if candidate matches target well enough.
 *
 * Algorithm (in order of preference):
 *   1. Exact case-insensitive match → return true immediately
 *   2. Substring match (case-insensitive) → return true
 *   3. Edit distance (Levenshtein) < 2 → return true (simple impl)
 *   4. Otherwise → return false
 */
function fuzzyMatchTitle(target: string, candidate: string): boolean {
  const t = target.toLowerCase()
  const c = candidate.toLowerCase()

  // Exact match (case-insensitive)
  if (t === c) return true

  // Substring match
  if (c.includes(t) || t.includes(c)) return true

  // Simple edit distance check: if strings are very similar length
  // and share most characters, consider it a match
  // (full Levenshtein would be overkill for MVP)
  const minLen = Math.min(t.length, c.length)
  const maxLen = Math.max(t.length, c.length)

  // If one is significantly longer than the other, probably not a match
  if (maxLen > minLen * 1.5) return false

  // Count matching characters (simple heuristic)
  let matches = 0
  for (let i = 0; i < Math.min(t.length, c.length); i++) {
    if (t[i] === c[i]) matches++
  }

  // If >60% characters match, fuzzy match
  return matches / minLen > 0.6
}

/**
 * validateCitations - Validate parsed citations against papers store.
 *
 * For each citation, fuzzy match against paper titles.
 * Returns LinkMetadata[] with paperId, status, and position.
 *
 * Example:
 *   citations = [{citationText: "Attention Is All You Need", position: 9, ...}]
 *   papers = [{id: "arxiv_1706", title: "Attention Is All You Need", ...}]
 *   → [{citationText: "Attention Is All You Need", paperId: "arxiv_1706", position: 9, status: "valid"}]
 */
export function validateCitations(citations: Citation[], papers: Paper[]): LinkMetadata[] {
  return citations.map(citation => {
    // Find matching paper by fuzzy match on title
    const matchedPaper = papers.find(p => fuzzyMatchTitle(citation.citationText, p.title))

    return {
      citationText: citation.citationText,
      paperId: matchedPaper?.id ?? null,
      position: citation.position,
      status: matchedPaper ? 'valid' : 'missing',
      content: citation.content,  // Store the full citation text for decorations
    }
  })
}

/**
 * getFuzzySuggestions - Get top 3 similar papers for a citation.
 *
 * Used for hover tooltip: "Did you mean: [Paper 1], [Paper 2], [Paper 3]?"
 * Only returns suggestions if citation is broken (paperId would be null).
 *
 * Algorithm: Score each paper by fuzzy match similarity, return top 3.
 */
export function getFuzzySuggestions(citationText: string, papers: Paper[]): Paper[] {
  const t = citationText.toLowerCase()

  // Score each paper
  const scored = papers.map(paper => {
    const c = paper.title.toLowerCase()

    // Exact match → score 100
    if (t === c) return { paper, score: 100 }

    // Substring match → score 80
    if (c.includes(t) || t.includes(c)) return { paper, score: 80 }

    // Character overlap → score 0-70
    let matches = 0
    for (let i = 0; i < Math.min(t.length, c.length); i++) {
      if (t[i] === c[i]) matches++
    }
    const minLen = Math.min(t.length, c.length)
    const charScore = (matches / minLen) * 70

    return { paper, score: charScore }
  })

  // Sort by score descending, take top 3
  return scored
    .filter(s => s.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 3)
    .map(s => s.paper)
}

/**
 * validateAndGetLinks - One-shot function to parse, validate, and return links + suggestions.
 *
 * Combines parseCitations + validateCitations for convenience in DocumentEditor.
 * Also computes suggestions for broken references.
 */
export function validateAndGetLinks(
  content: string,
  papers: Paper[]
): {
  links: LinkMetadata[]
  suggestions: Map<string, Paper[]>  // Map from citationText → suggestions
} {
  const citations = parseCitations(content)
  const links = validateCitations(citations, papers)

  // Compute suggestions for broken refs
  const suggestions = new Map<string, Paper[]>()
  for (const link of links) {
    if (link.status === 'missing') {
      suggestions.set(link.citationText, getFuzzySuggestions(link.citationText, papers))
    }
  }

  return { links, suggestions }
}
