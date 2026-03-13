import { describe, it, expect, beforeEach, vi } from 'vitest'
import JSZip from 'jszip'
import { exportWorkspace, generateExportFilename } from '../../src/lib/services/workspace-export'
import type { Paper } from '../../src/lib/types/paper'
import type { Note } from '../../src/lib/types/notes'

// Mock Tauri fs plugin
vi.mock('@tauri-apps/plugin-fs', () => ({
  readFile: vi.fn(async () => new Blob(['PDF content']))
}))

describe('workspace-export service', () => {
  const mockPaper: Paper = {
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
    isOpenAccess: true,
    openAccessStatus: 'green',
    pdfUrl: null,
    localPdfPath: null,
    pdfDownloaded: false,
    importedAt: '2025-01-01T00:00:00Z',
    addedAt: '2025-01-01T00:00:00Z',
    lastUpdated: '2025-01-01T00:00:00Z',
    tags: ['test']
  }

  const mockNote: Note = {
    id: 'note_001',
    paperId: 'arxiv_001',
    title: 'Note',
    content: 'Test note',
    createdAt: '2025-01-01T00:00:00Z',
    updatedAt: '2025-01-01T00:00:00Z'
  }

  describe('exportWorkspace', () => {
    it('creates valid ZIP blob', async () => {
      const blob = await exportWorkspace(
        [mockPaper],
        [mockNote],
        { nodes: [], edges: [], viewport: { x: 0, y: 0, zoom: 1 } },
        { includePDFs: false, includeAnnotations: false, includeGraph: false }
      )
      expect(blob).toBeInstanceOf(Blob)
      expect(blob.size).toBeGreaterThan(0)
    })

    it('creates metadata.json in ZIP', async () => {
      const blob = await exportWorkspace(
        [mockPaper],
        [mockNote],
        { nodes: [], edges: [], viewport: { x: 0, y: 0, zoom: 1 } },
        { includePDFs: false, includeAnnotations: false, includeGraph: false }
      )
      const zip = await JSZip.loadAsync(blob)
      const metadata = await zip.file('metadata.json')?.async('text')
      expect(metadata).toBeDefined()
      const parsed = JSON.parse(metadata!)
      expect(parsed.version).toBe('1.0')
      expect(parsed.papers.length).toBe(1)
    })

    it('creates papers/ folder with HTML files', async () => {
      const blob = await exportWorkspace(
        [mockPaper],
        [mockNote],
        { nodes: [], edges: [], viewport: { x: 0, y: 0, zoom: 1 } },
        { includePDFs: false, includeAnnotations: false, includeGraph: false }
      )
      const zip = await JSZip.loadAsync(blob)
      const paperFile = await zip.file('papers/arxiv_001.html')?.async('text')
      expect(paperFile).toBeDefined()
      expect(paperFile).toContain('Test Paper')
    })

    it('creates assets/ folder with CSS and search', async () => {
      const blob = await exportWorkspace(
        [mockPaper],
        [mockNote],
        { nodes: [], edges: [], viewport: { x: 0, y: 0, zoom: 1 } },
        { includePDFs: false, includeAnnotations: false, includeGraph: false }
      )
      const zip = await JSZip.loadAsync(blob)
      const css = await zip.file('assets/styles.css')?.async('text')
      const search = await zip.file('assets/search.js')?.async('text')
      expect(css).toBeDefined()
      expect(search).toBeDefined()
    })

    it('creates index.html entry point', async () => {
      const blob = await exportWorkspace(
        [mockPaper],
        [mockNote],
        { nodes: [], edges: [], viewport: { x: 0, y: 0, zoom: 1 } },
        { includePDFs: false, includeAnnotations: false, includeGraph: false }
      )
      const zip = await JSZip.loadAsync(blob)
      const indexFile = await zip.file('index.html')?.async('text')
      expect(indexFile).toBeDefined()
      expect(indexFile).toContain('Research Workspace')
    })

    it('calls progress callback during export', async () => {
      const progress = vi.fn()
      const papers = [mockPaper, { ...mockPaper, id: 'arxiv_002' }]
      await exportWorkspace(
        papers,
        [mockNote],
        { nodes: [], edges: [], viewport: { x: 0, y: 0, zoom: 1 } },
        { includePDFs: false, includeAnnotations: false, includeGraph: false },
        progress
      )
      expect(progress).toHaveBeenCalled()
      // Progress should be called for each paper
      expect(progress.mock.calls.length).toBeGreaterThan(0)
    })

    it('creates pdfs/ folder when includePDFs is true', async () => {
      const paperWithPDF = { ...mockPaper, localPdfPath: '/path/to/pdf.pdf' }
      const blob = await exportWorkspace(
        [paperWithPDF],
        [],
        { nodes: [], edges: [], viewport: { x: 0, y: 0, zoom: 1 } },
        { includePDFs: true, includeAnnotations: false, includeGraph: false }
      )
      const zip = await JSZip.loadAsync(blob)
      const pdfs = zip.folder('pdfs')
      expect(pdfs).toBeDefined()
    })

    it('does not create pdfs/ folder when includePDFs is false', async () => {
      const paperWithPDF = { ...mockPaper, localPdfPath: '/path/to/pdf.pdf' }
      const blob = await exportWorkspace(
        [paperWithPDF],
        [],
        { nodes: [], edges: [], viewport: { x: 0, y: 0, zoom: 1 } },
        { includePDFs: false, includeAnnotations: false, includeGraph: false }
      )
      const zip = await JSZip.loadAsync(blob)
      // Check if any file starts with 'pdfs/'
      const hasPdfs = Object.keys(zip.files).some(f => f.startsWith('pdfs/'))
      expect(hasPdfs).toBe(false)
    })

    it('handles empty workspace', async () => {
      const blob = await exportWorkspace(
        [],
        [],
        { nodes: [], edges: [], viewport: { x: 0, y: 0, zoom: 1 } },
        { includePDFs: false, includeAnnotations: false, includeGraph: false }
      )
      expect(blob.size).toBeGreaterThan(0)
      const zip = await JSZip.loadAsync(blob)
      const metadata = await zip.file('metadata.json')?.async('text')
      const parsed = JSON.parse(metadata!)
      expect(parsed.papers.length).toBe(0)
    })

    it('includes graph data when includeGraph is true', async () => {
      const graphData = {
        nodes: [{ id: 'node1', data: { title: 'Node' }, position: { x: 0, y: 0 } }],
        edges: [{ id: 'edge1', source: 'node1', target: 'node2', data: {} }],
        viewport: { x: 100, y: 200, zoom: 1.5 }
      }
      const blob = await exportWorkspace(
        [mockPaper],
        [],
        graphData,
        { includePDFs: false, includeAnnotations: false, includeGraph: true }
      )
      const zip = await JSZip.loadAsync(blob)
      const metadata = await zip.file('metadata.json')?.async('text')
      const parsed = JSON.parse(metadata!)
      expect(parsed.graph.nodes.length).toBe(1)
      expect(parsed.graph.viewport.zoom).toBe(1.5)
    })
  })

  describe('generateExportFilename', () => {
    it('generates filename with ISO date', () => {
      const filename = generateExportFilename()
      expect(filename).toMatch(/^export-workspace-\d{4}-\d{2}-\d{2}\.zip$/)
    })
  })
})
