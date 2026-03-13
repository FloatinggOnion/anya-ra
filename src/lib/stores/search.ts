/**
 * Full-text search store — indexes papers + notes for instant search
 * Uses minisearch for lightweight client-side FTS
 */

import { writable, derived } from 'svelte/store'
import MiniSearch from 'minisearch'
import { papers } from './papers'
import { notes } from './notes'
import type { Paper } from '../types/paper'

// Search index
interface SearchDocument {
  id: string
  type: 'paper' | 'note'
  title: string
  body: string
  paperId?: string
}

interface SearchResult {
  id: string
  type: 'paper' | 'note'
  title: string
  match: string
  paperId?: string
  score: number
}

const miniSearch = new MiniSearch({
  fields: ['title', 'body'],
  storeFields: ['id', 'type', 'title', 'paperId'],
  searchOptions: {
    boost: { title: 2 },
    fuzzy: 0.2,
    prefix: true,
  },
})

// Store state
export const searchQuery = writable<string>('')
export const searchResults = writable<SearchResult[]>([])
export const isSearching = writable(false)

// Rebuild index when papers or notes change
export function rebuildSearchIndex(paperList: Paper[], notesList: Map<string, any>) {
  const docs: SearchDocument[] = []

  // Index all papers
  for (const paper of paperList) {
    docs.push({
      id: paper.id,
      type: 'paper',
      title: paper.title,
      body: `${paper.abstract || ''} ${paper.authors.join(' ')}`,
    })
  }

  // Index all notes
  for (const [paperId, sidecar] of notesList) {
    if (sidecar.notes && sidecar.notes.length > 0) {
      for (const note of sidecar.notes) {
        docs.push({
          id: `${paperId}-note`,
          type: 'note',
          title: `Notes: ${paperList.find(p => p.id === paperId)?.title || 'Unknown'}`,
          body: note.content,
          paperId,
        })
      }
    }
  }

  miniSearch.removeAll()
  miniSearch.addAll(docs)
}

// Perform search
function performSearch(query: string, paperList: Paper[], notesList: Map<string, any>) {
  if (!query.trim()) {
    searchResults.set([])
    return
  }

  isSearching.set(true)

  try {
    // Ensure index is built
    if (miniSearch.documentCount === 0) {
      rebuildSearchIndex(paperList, notesList)
    }

    const rawResults = miniSearch.search(query)
    const results: SearchResult[] = rawResults.map((result) => ({
      id: result.id,
      type: (result.type as 'paper' | 'note') || 'paper',
      title: result.title || '',
      paperId: result.paperId,
      match: query,
      score: result.score,
    }))

    searchResults.set(results)
  } finally {
    isSearching.set(false)
  }
}

// Subscribe to search query changes
export function setupSearch() {
  let paperList: Paper[] = []
  let notesList: Map<string, any> = new Map()

  papers.subscribe((p) => {
    paperList = p
    rebuildSearchIndex(paperList, notesList)
  })

  notes.subscribe((n) => {
    notesList = n
    rebuildSearchIndex(paperList, notesList)
  })

  searchQuery.subscribe((query) => {
    performSearch(query, paperList, notesList)
  })
}

// Getter for search index size
export function getSearchIndexSize() {
  return miniSearch.documentCount
}
