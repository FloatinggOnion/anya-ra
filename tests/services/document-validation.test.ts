import { describe, it, expect } from 'vitest'
import { parseCitations, validateCitations, getFuzzySuggestions } from '../../src/lib/services/document-validation'
import type { Paper } from '../../src/lib/types/paper'

describe('Document Validation Service', () => {
  describe('parseCitations', () => {
    it('should extract single citation', () => {
      const content = 'As noted [cite: Attention Is All You Need], transformers...'
      const citations = parseCitations(content)

      expect(citations).toHaveLength(1)
      expect(citations[0].citationText).toBe('Attention Is All You Need')
      expect(citations[0].position).toBe(9)
      expect(citations[0].content).toBe('[cite: Attention Is All You Need]')
    })

    it('should extract multiple citations', () => {
      const content = 'First [cite: Paper A] and second [cite: Paper B].'
      const citations = parseCitations(content)

      expect(citations).toHaveLength(2)
      expect(citations[0].citationText).toBe('Paper A')
      expect(citations[1].citationText).toBe('Paper B')
    })

    it('should handle whitespace in citation text', () => {
      const content = '[cite:   Paper With Spaces   ]'
      const citations = parseCitations(content)

      expect(citations).toHaveLength(1)
      expect(citations[0].citationText).toBe('Paper With Spaces')
    })

    it('should return empty array for no citations', () => {
      const content = 'No citations here'
      const citations = parseCitations(content)

      expect(citations).toHaveLength(0)
    })
  })

  describe('validateCitations', () => {
    const mockPapers: Paper[] = [
      {
        id: 'arxiv_1706_03762',
        title: 'Attention Is All You Need',
        authors: ['Vaswani', 'Shazeer'],
        year: 2017,
        abstract: 'Abstract about transformers',
        source: 'arxiv',
        url: 'https://arxiv.org/abs/1706.03762',
        pdfDownloaded: false,
        localPdfPath: null,
        createdAt: '2024-01-01',
        notes: '',
      },
      {
        id: 'arxiv_1810_04805',
        title: 'BERT: Pre-training of Deep Bidirectional Transformers',
        authors: ['Devlin'],
        year: 2018,
        abstract: 'BERT abstract',
        source: 'arxiv',
        url: 'https://arxiv.org/abs/1810.04805',
        pdfDownloaded: false,
        localPdfPath: null,
        createdAt: '2024-01-01',
        notes: '',
      },
    ]

    it('should validate exact match', () => {
      const citations = [
        { citationText: 'Attention Is All You Need', position: 0, content: '[cite: Attention Is All You Need]' },
      ]
      const links = validateCitations(citations, mockPapers)

      expect(links).toHaveLength(1)
      expect(links[0].paperId).toBe('arxiv_1706_03762')
      expect(links[0].status).toBe('valid')
    })

    it('should validate case-insensitive match', () => {
      const citations = [
        { citationText: 'attention is all you need', position: 0, content: '[cite: attention is all you need]' },
      ]
      const links = validateCitations(citations, mockPapers)

      expect(links[0].paperId).toBe('arxiv_1706_03762')
      expect(links[0].status).toBe('valid')
    })

    it('should validate substring match', () => {
      const citations = [
        { citationText: 'Attention', position: 0, content: '[cite: Attention]' },
      ]
      const links = validateCitations(citations, mockPapers)

      expect(links[0].paperId).toBe('arxiv_1706_03762')
      expect(links[0].status).toBe('valid')
    })

    it('should mark missing papers as invalid', () => {
      const citations = [
        { citationText: 'Unknown Paper', position: 0, content: '[cite: Unknown Paper]' },
      ]
      const links = validateCitations(citations, mockPapers)

      expect(links[0].paperId).toBeNull()
      expect(links[0].status).toBe('missing')
    })
  })

  describe('getFuzzySuggestions', () => {
    const mockPapers: Paper[] = [
      {
        id: '1',
        title: 'Attention Is All You Need',
        authors: [],
        year: 2017,
        abstract: '',
        source: 'arxiv',
        url: '',
        pdfDownloaded: false,
        localPdfPath: null,
        createdAt: '2024-01-01',
        notes: '',
      },
      {
        id: '2',
        title: 'BERT: Pre-training',
        authors: [],
        year: 2018,
        abstract: '',
        source: 'arxiv',
        url: '',
        pdfDownloaded: false,
        localPdfPath: null,
        createdAt: '2024-01-01',
        notes: '',
      },
      {
        id: '3',
        title: 'GPT-2',
        authors: [],
        year: 2019,
        abstract: '',
        source: 'arxiv',
        url: '',
        pdfDownloaded: false,
        localPdfPath: null,
        createdAt: '2024-01-01',
        notes: '',
      },
    ]

    it('should suggest similar papers', () => {
      const suggestions = getFuzzySuggestions('Attention', mockPapers)

      expect(suggestions.length).toBeGreaterThan(0)
      expect(suggestions[0].id).toBe('1')  // Best match
    })

    it('should return max 3 suggestions', () => {
      const suggestions = getFuzzySuggestions('the', mockPapers)

      expect(suggestions.length).toBeLessThanOrEqual(3)
    })
  })
})
