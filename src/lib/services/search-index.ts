/**
 * Full-text search index service for exported workspaces.
 * Uses lunr.js for efficient client-side indexing.
 * 
 * Pattern: Papers + Notes → lunr Index → JSON serialization → Embed in HTML
 */

import lunr, { type Index } from 'lunr'
import type { Paper } from '../types/paper'
import type { Note } from '../types/notes'

/**
 * Create a lunr.js index from papers and their associated notes.
 * Boost relevance for title, authors, tags.
 */
export function createSearchIndex(
  papers: Paper[],
  notes: Map<string, Note[]> | Note[]
): Index {
  // Handle both Map and array formats for flexibility
  const notesMap = Array.isArray(notes)
    ? new Map(notes.map(n => [n.paperId, [n]]))
    : notes

  return lunr(function() {
    // Configure fields with relevance boosting
    this.field('title', { boost: 10 })
    this.field('authors', { boost: 5 })
    this.field('abstract', { boost: 3 })
    this.field('tags', { boost: 8 })
    this.field('notes') // Lower boost for note content (1x)

    // Index each paper as a document
    papers.forEach(paper => {
      const paperNotes = notesMap.get(paper.id) || []
      const noteContent = paperNotes.map(n => n.content).join(' ')

      // Create searchable document combining paper + its notes
      this.add({
        id: paper.id,
        title: paper.title,
        authors: paper.authors.join(' '),
        abstract: paper.abstract || '',
        tags: (paper.tags || []).join(' '),
        notes: noteContent
      })
    })
  })
}

/**
 * Serialize lunr index to JSON for embedding in HTML.
 * Result can be embedded as: <script>const idx = lunr.Index.load(${serializeIndex(index)})</script>
 */
export function serializeIndex(idx: Index): string {
  return JSON.stringify(idx.toJSON())
}

/**
 * Deserialize JSON back to lunr index (for testing or runtime use).
 */
export function deserializeIndex(json: string): Index {
  const data = JSON.parse(json)
  return lunr.Index.load(data)
}

/**
 * Perform full-text search on index.
 * Returns array of { ref (paperId), score (relevance 0-1) }.
 */
export function searchIndex(
  idx: Index,
  query: string
): Array<{ ref: string; score: number }> {
  try {
    return idx.search(query)
  } catch (e) {
    // Invalid query syntax (rare with lunr)
    console.warn('Search error:', e)
    return []
  }
}

/**
 * Extract a snippet of text around search terms for preview.
 * This is NOT built into lunr — app provides it for UI.
 */
export function extractSnippet(
  text: string,
  query: string,
  contextChars: number = 100
): string {
  const lowerText = text.toLowerCase()
  const lowerQuery = query.toLowerCase()
  const index = lowerText.indexOf(lowerQuery)

  if (index === -1) return text.substring(0, contextChars) + '...'

  const start = Math.max(0, index - contextChars / 2)
  const end = Math.min(text.length, index + lowerQuery.length + contextChars / 2)
  const snippet = text.substring(start, end)

  return (start > 0 ? '...' : '') + snippet + (end < text.length ? '...' : '')
}
