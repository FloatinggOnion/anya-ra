import { writable, derived } from 'svelte/store'
import type { Paper, PaperSource } from '../types/paper'

// ─── Core state ──────────────────────────────────────────────────────────────

export const papers = writable<Paper[]>([])
export const selectedPaperId = writable<string | null>(null)
export const searchQuery = writable<string>('')
export const sourceFilter = writable<'all' | PaperSource>('all')

// ─── Derived stores ──────────────────────────────────────────────────────────

/** The currently selected paper object */
export const selectedPaper = derived(
  [papers, selectedPaperId],
  ([$papers, $selectedId]) => {
    if (!$selectedId) return null
    return $papers.find((p) => p.id === $selectedId) ?? null
  }
)

/** Papers filtered by search query and source */
export const filteredPapers = derived(
  [papers, searchQuery, sourceFilter],
  ([$papers, $query, $source]) => {
    let filtered = $papers

    // Filter by source
    if ($source !== 'all') {
      filtered = filtered.filter((p) => p.source === $source)
    }

    // Filter by search query (title, authors, abstract)
    if ($query.trim()) {
      const q = $query.toLowerCase()
      filtered = filtered.filter(
        (p) =>
          p.title.toLowerCase().includes(q) ||
          p.authors.some((a) => a.toLowerCase().includes(q)) ||
          (p.abstract && p.abstract.toLowerCase().includes(q))
      )
    }

    return filtered
  }
)

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Add a paper (skip duplicates by id) */
export function addPaper(paper: Paper) {
  papers.update((list) => {
    if (list.some((p) => p.id === paper.id)) return list
    return [...list, paper]
  })
}

/** Remove paper from list by id */
export function removePaper(paperId: string) {
  papers.update((list) => list.filter((p) => p.id !== paperId))
}

/** Replace an existing paper with updated data */
export function updatePaper(paper: Paper) {
  papers.update((list) => list.map((p) => (p.id === paper.id ? paper : p)))
}
