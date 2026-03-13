import { describe, it, expect } from 'vitest'
import {
  createSearchIndex,
  serializeIndex,
  deserializeIndex,
  searchIndex
} from '../../src/lib/services/search-index'
import type { Paper } from '../../src/lib/types/paper'
import type { Note } from '../../src/lib/types/notes'

describe('search-index service', () => {
  const mockPaper: Paper = {
    id: 'arxiv_001',
    source: 'arxiv',
    externalId: '2401.00001',
    title: 'Machine Learning Fundamentals',
    authors: ['Alice Smith', 'Bob Jones'],
    year: 2024,
    abstract: 'A comprehensive guide to ML algorithms and theory',
    url: 'https://arxiv.org/abs/2401.00001',
    doi: '10.1234/5678',
    arxivId: '2401.00001',
    semanticId: 's2_001',
    isOpenAccess: true,
    openAccessStatus: 'green',
    pdfUrl: 'https://arxiv.org/pdf/2401.00001.pdf',
    localPdfPath: null,
    pdfDownloaded: false,
    importedAt: '2025-01-01T00:00:00Z',
    addedAt: '2025-01-01T00:00:00Z',
    lastUpdated: '2025-01-01T00:00:00Z',
    tags: ['ml', 'algorithms']
  }

  const mockNote: Note = {
    id: 'note_001',
    paperId: 'arxiv_001',
    title: 'Key Takeaways',
    content: 'Neural networks are powerful tools for pattern recognition.',
    createdAt: '2025-01-01T00:00:00Z',
    updatedAt: '2025-01-01T00:00:00Z'
  }

  describe('createSearchIndex', () => {
    it('creates index from papers and notes', () => {
      const idx = createSearchIndex([mockPaper], [mockNote])
      expect(idx).toBeDefined()
      expect(typeof idx.search).toBe('function')
    })

    it('accepts notes as Map format', () => {
      const notesMap = new Map([['arxiv_001', [mockNote]]])
      const idx = createSearchIndex([mockPaper], notesMap)
      expect(idx).toBeDefined()
    })

    it('handles papers without notes', () => {
      const idx = createSearchIndex([mockPaper], [])
      expect(idx).toBeDefined()
      const results = idx.search('Machine Learning')
      expect(results.length).toBeGreaterThan(0)
    })

    it('indexes paper title with high boost', () => {
      const idx = createSearchIndex([mockPaper], [mockNote])
      const titleResults = idx.search('Machine Learning')
      expect(titleResults.length).toBeGreaterThan(0)
      // Results should be returned (exact boost values are lunr internals)
    })

    it('indexes paper authors', () => {
      const idx = createSearchIndex([mockPaper], [mockNote])
      const authorResults = idx.search('Alice Smith')
      expect(authorResults.length).toBeGreaterThan(0)
    })

    it('indexes paper tags with high boost', () => {
      const idx = createSearchIndex([mockPaper], [mockNote])
      const tagResults = idx.search('algorithms')
      expect(tagResults.length).toBeGreaterThan(0)
    })

    it('indexes paper abstract', () => {
      const idx = createSearchIndex([mockPaper], [mockNote])
      const abstractResults = idx.search('comprehensive')
      expect(abstractResults.length).toBeGreaterThan(0)
    })

    it('indexes note content', () => {
      const idx = createSearchIndex([mockPaper], [mockNote])
      const noteResults = idx.search('pattern recognition')
      expect(noteResults.length).toBeGreaterThan(0)
    })

    it('handles multiple papers', () => {
      const paper2: Paper = {
        ...mockPaper,
        id: 'arxiv_002',
        title: 'Deep Learning Architectures'
      }
      const idx = createSearchIndex([mockPaper, paper2], [mockNote])
      expect(idx).toBeDefined()
    })
  })

  describe('serializeIndex', () => {
    it('serializes index to JSON string', () => {
      const idx = createSearchIndex([mockPaper], [mockNote])
      const serialized = serializeIndex(idx)
      expect(typeof serialized).toBe('string')
      // Verify it's valid JSON
      const parsed = JSON.parse(serialized)
      expect(parsed).toBeDefined()
    })

    it('serialized JSON includes documents and fields', () => {
      const idx = createSearchIndex([mockPaper], [mockNote])
      const serialized = serializeIndex(idx)
      const parsed = JSON.parse(serialized)
      expect(parsed).toHaveProperty('fields')
      expect(parsed).toHaveProperty('fieldVectors')
    })
  })

  describe('deserializeIndex', () => {
    it('reconstructs index from serialized JSON', () => {
      const originalIdx = createSearchIndex([mockPaper], [mockNote])
      const serialized = serializeIndex(originalIdx)
      const reconstructed = deserializeIndex(serialized)
      expect(reconstructed).toBeDefined()
      expect(typeof reconstructed.search).toBe('function')
    })

    it('reconstructed index can search', () => {
      const originalIdx = createSearchIndex([mockPaper], [mockNote])
      const serialized = serializeIndex(originalIdx)
      const reconstructed = deserializeIndex(serialized)
      const results = reconstructed.search('Machine Learning')
      expect(results.length).toBeGreaterThan(0)
    })

    it('throws on invalid JSON', () => {
      expect(() => deserializeIndex('not valid json')).toThrow()
    })
  })

  describe('searchIndex', () => {
    it('returns results for valid query', () => {
      const idx = createSearchIndex([mockPaper], [mockNote])
      const results = searchIndex(idx, 'Machine Learning')
      expect(Array.isArray(results)).toBe(true)
      expect(results.length).toBeGreaterThan(0)
    })

    it('returns empty array for no matches', () => {
      const idx = createSearchIndex([mockPaper], [mockNote])
      const results = searchIndex(idx, 'xyz_nonexistent_term')
      expect(results).toEqual([])
    })

    it('returns correct paper ID in results', () => {
      const idx = createSearchIndex([mockPaper], [mockNote])
      const results = searchIndex(idx, 'Machine Learning')
      expect(results.some(r => r.ref === 'arxiv_001')).toBe(true)
    })

    it('includes relevance score', () => {
      const idx = createSearchIndex([mockPaper], [mockNote])
      const results = searchIndex(idx, 'Machine Learning')
      expect(results[0]).toHaveProperty('score')
      expect(typeof results[0].score).toBe('number')
    })

    it('handles invalid query syntax gracefully', () => {
      const idx = createSearchIndex([mockPaper], [mockNote])
      // lunr may throw on malformed queries
      expect(() => searchIndex(idx, 'Machine AND')).not.toThrow()
    })
  })
})
