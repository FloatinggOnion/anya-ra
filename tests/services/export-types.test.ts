import { describe, it, expect } from 'vitest'
import { 
  validateExportMetadata, 
  estimateExportSize, 
  type ExportMetadata 
} from '../../src/lib/types/export'

describe('export types', () => {
  describe('validateExportMetadata', () => {
    it('accepts valid v1.0 schema', () => {
      const valid: ExportMetadata = {
        version: '1.0',
        workspace: {
          name: 'Test Workspace',
          createdAt: '2025-01-01T00:00:00Z',
          exportedAt: '2025-01-02T00:00:00Z'
        },
        papers: [],
        notes: [],
        graph: { nodes: [], edges: [], viewport: { x: 0, y: 0, zoom: 1 } }
      }
      expect(validateExportMetadata(valid)).toBe(true)
    })

    it('rejects invalid schema (missing version)', () => {
      const invalid = {
        workspace: { name: 'Test' },
        papers: [],
        notes: []
      }
      expect(validateExportMetadata(invalid)).toBe(false)
    })

    it('rejects non-object', () => {
      expect(validateExportMetadata(null)).toBe(false)
      expect(validateExportMetadata('string')).toBe(false)
      expect(validateExportMetadata([])).toBe(false)
    })

    it('validates papers array structure', () => {
      const validWithPapers: ExportMetadata = {
        version: '1.0',
        workspace: {
          name: 'Test',
          createdAt: '2025-01-01T00:00:00Z',
          exportedAt: '2025-01-02T00:00:00Z'
        },
        papers: [
          {
            id: 'arxiv_001',
            source: 'arxiv',
            externalId: '2401.00001',
            title: 'Test Paper',
            authors: ['Author A'],
            year: 2024,
            abstract: 'Test abstract',
            url: 'https://arxiv.org/abs/2401.00001',
            doi: null,
            arxivId: '2401.00001',
            semanticId: null,
            tags: ['test'],
            pdfIncluded: false,
            importedAt: '2025-01-01T00:00:00Z'
          }
        ],
        notes: [],
        graph: { nodes: [], edges: [], viewport: { x: 0, y: 0, zoom: 1 } }
      }
      expect(validateExportMetadata(validWithPapers)).toBe(true)
    })

    it('rejects invalid paper in array', () => {
      const invalid = {
        version: '1.0',
        workspace: { name: 'Test', createdAt: '2025-01-01T00:00:00Z', exportedAt: '2025-01-02T00:00:00Z' },
        papers: [{ id: 'arxiv_001' }], // Missing title, authors
        notes: [],
        graph: { nodes: [], edges: [], viewport: { x: 0, y: 0, zoom: 1 } }
      }
      expect(validateExportMetadata(invalid)).toBe(false)
    })

    it('validates notes array structure', () => {
      const validWithNotes: ExportMetadata = {
        version: '1.0',
        workspace: {
          name: 'Test',
          createdAt: '2025-01-01T00:00:00Z',
          exportedAt: '2025-01-02T00:00:00Z'
        },
        papers: [],
        notes: [
          {
            paperId: 'arxiv_001',
            content: 'Note content',
            createdAt: '2025-01-01T00:00:00Z',
            updatedAt: '2025-01-01T00:00:00Z'
          }
        ],
        graph: { nodes: [], edges: [], viewport: { x: 0, y: 0, zoom: 1 } }
      }
      expect(validateExportMetadata(validWithNotes)).toBe(true)
    })
  })

  describe('estimateExportSize', () => {
    it('returns size breakdown', () => {
      const estimate = estimateExportSize([], [], { includePDFs: false, includeAnnotations: false, includeGraph: false })
      expect(estimate).toHaveProperty('htmlSize')
      expect(estimate).toHaveProperty('metadataSize')
      expect(estimate).toHaveProperty('pdfSize')
      expect(estimate).toHaveProperty('totalSize')
    })

    it('includes PDF size when option enabled', () => {
      const noPdfs = estimateExportSize([], [], { includePDFs: false, includeAnnotations: false, includeGraph: false })
      const withPdfs = estimateExportSize([], [], { includePDFs: true, includeAnnotations: false, includeGraph: false })
      expect(withPdfs.pdfSize).toBeGreaterThanOrEqual(noPdfs.pdfSize)
    })
  })
})
