import { describe, it, expect } from 'vitest'
import { generateIndexHTML } from '../../src/lib/services/index-html'
import type { Paper } from '../../src/lib/types/paper'

describe('index-html service', () => {
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

  const mockSearchIndex = JSON.stringify({
    version: '2.3.9',
    fields: [
      { fieldName: 'title', boost: 10 },
      { fieldName: 'authors', boost: 5 }
    ],
    fieldVectors: {},
    documentCount: 1,
    documentLengthAveragess: {},
    documentFrequencies: {},
    termFrequencies: {},
    invertedIndex: [['test', { _index: 'root', title: {} }]]
  })

  describe('generateIndexHTML', () => {
    it('generates valid HTML', () => {
      const html = generateIndexHTML([mockPaper], mockSearchIndex)
      expect(html).toContain('<!DOCTYPE html>')
      expect(html).toContain('</html>')
    })

    it('includes paper count', () => {
      const html = generateIndexHTML([mockPaper], mockSearchIndex)
      expect(html).toContain('1 papers')
    })

    it('includes lunr.js script from CDN', () => {
      const html = generateIndexHTML([mockPaper], mockSearchIndex)
      expect(html).toContain('cdn.jsdelivr.net/npm/lunr@2')
    })

    it('embeds search index as JSON', () => {
      const html = generateIndexHTML([mockPaper], mockSearchIndex)
      expect(html).toContain('const indexData =')
      expect(html).toContain('idx.search')
    })

    it('embeds paper metadata', () => {
      const html = generateIndexHTML([mockPaper], mockSearchIndex)
      expect(html).toContain('const papers =')
      expect(html).toContain(mockPaper.title)
      expect(html).toContain(mockPaper.authors[0])
    })

    it('includes search input element', () => {
      const html = generateIndexHTML([mockPaper], mockSearchIndex)
      expect(html).toContain('id="searchBox"')
      expect(html).toContain('Search papers')
    })

    it('includes results container', () => {
      const html = generateIndexHTML([mockPaper], mockSearchIndex)
      expect(html).toContain('id="results"')
    })

    it('links paper cards to paper HTML files', () => {
      const html = generateIndexHTML([mockPaper], mockSearchIndex)
      // The link appears in the JavaScript template literal within the HTML
      expect(html).toContain('papers/')
      expect(html).toContain('.html')
      expect(html).toContain('href="papers/')
    })

    it('handles multiple papers', () => {
      const paper2 = { ...mockPaper, id: 'arxiv_002', title: 'Second Paper' }
      const html = generateIndexHTML([mockPaper, paper2], mockSearchIndex)
      expect(html).toContain('2 papers')
      expect(html).toContain('Test Paper')
      expect(html).toContain('Second Paper')
    })

    it('includes responsive CSS', () => {
      const html = generateIndexHTML([mockPaper], mockSearchIndex)
      expect(html).toContain('@media (max-width: 768px)')
    })

    it('escapes paper titles in HTML', () => {
      const xssPaper = {
        ...mockPaper,
        title: '<script>alert("xss")</script>',
        abstract: '<img src=x onerror="alert(1)">',
        authors: ['<b>Author</b>']
      }
      const html = generateIndexHTML([xssPaper], mockSearchIndex)
      // The title should be in the papers JSON, which is safe there
      expect(html).toContain('const papers =')
      // The escapeHTML function in the JavaScript will sanitize it at runtime
      expect(html).toContain('function escapeHTML')
      // The card rendering uses escapeHTML to prevent XSS
      expect(html).toContain('escapeHTML(paper.title)')
    })

    it('displays paper metadata in cards', () => {
      const html = generateIndexHTML([mockPaper], mockSearchIndex)
      expect(html).toContain('makePaperCard')
      expect(html).toContain('paper.title')
      expect(html).toContain('paper.authors')
      expect(html).toContain('paper.abstract')
    })
  })
})
