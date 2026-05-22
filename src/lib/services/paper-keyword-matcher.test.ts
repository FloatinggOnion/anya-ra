import { describe, it, expect, vi } from 'vitest'
import { PaperKeywordMatcher } from './paper-keyword-matcher'
import type { Paper } from '../types/paper'

// ─── Test fixtures ────────────────────────────────────────────────────────────

const samplePapers: Paper[] = [
  {
    id: 'p1',
    source: 'arxiv',
    externalId: '1706.03762',
    title: 'Attention Is All You Need',
    authors: ['Vaswani', 'Shazeer', 'Parmar'],
    year: 2017,
    abstract: 'The dominant sequence transduction models are based on complex recurrent or convolutional neural networks that include an encoder and a decoder. The best performing models also connect the encoder and decoder through an attention mechanism. We propose a new simple network architecture, the Transformer, based solely on attention mechanisms, dispensing with recurrence and convolutions entirely.',
    url: 'https://arxiv.org/abs/1706.03762',
    doi: null,
    arxivId: '1706.03762',
    semanticId: null,
    isOpenAccess: true,
    openAccessStatus: 'gold',
    pdfUrl: null,
    localPdfPath: null,
    pdfDownloaded: false,
    importedAt: '2024-01-01T00:00:00Z',
    addedAt: '2024-01-01T00:00:00Z',
    lastUpdated: '2024-01-01T00:00:00Z',
    tags: []
  },
  {
    id: 'p2',
    source: 'arxiv',
    externalId: '1810.04805',
    title: 'BERT: Pre-training of Deep Bidirectional Transformers',
    authors: ['Devlin', 'Chang', 'Lee', 'Toutanova'],
    year: 2019,
    abstract: 'We introduce a new language representation model called BERT, which stands for Bidirectional Encoder Representations from Transformers. Unlike recent language representation models, BERT is designed to pre-train deep bidirectional representations from unlabeled text by jointly conditioning on both left and right context in all layers.',
    url: 'https://arxiv.org/abs/1810.04805',
    doi: null,
    arxivId: '1810.04805',
    semanticId: null,
    isOpenAccess: true,
    openAccessStatus: 'gold',
    pdfUrl: null,
    localPdfPath: null,
    pdfDownloaded: false,
    importedAt: '2024-01-01T00:00:00Z',
    addedAt: '2024-01-01T00:00:00Z',
    lastUpdated: '2024-01-01T00:00:00Z',
    tags: []
  },
  {
    id: 'p3',
    source: 'arxiv',
    externalId: '1901.00000',
    title: 'Quantum Chromodynamics and Flavored Quarks',
    authors: ['Smith', 'Jones'],
    year: 2019,
    abstract: 'A comprehensive study of quantum chromodynamics (QCD) and its implications for flavored quark interactions in high-energy particle physics.',
    url: 'https://arxiv.org/abs/1901.00000',
    doi: null,
    arxivId: '1901.00000',
    semanticId: null,
    isOpenAccess: true,
    openAccessStatus: 'gold',
    pdfUrl: null,
    localPdfPath: null,
    pdfDownloaded: false,
    importedAt: '2024-01-01T00:00:00Z',
    addedAt: '2024-01-01T00:00:00Z',
    lastUpdated: '2024-01-01T00:00:00Z',
    tags: []
  }
]

function createPaper(overrides: Partial<Paper> & { id: string }): Paper {
  return {
    id: overrides.id,
    source: 'arxiv',
    externalId: overrides.id,
    title: overrides.title ?? `Paper ${overrides.id}`,
    authors: overrides.authors ?? ['Author A'],
    year: overrides.year ?? 2020,
    abstract: overrides.abstract ?? null,
    url: `https://example.com/${overrides.id}`,
    doi: null,
    arxivId: null,
    semanticId: null,
    isOpenAccess: true,
    openAccessStatus: null,
    pdfUrl: null,
    localPdfPath: null,
    pdfDownloaded: false,
    importedAt: '2024-01-01T00:00:00Z',
    addedAt: '2024-01-01T00:00:00Z',
    lastUpdated: '2024-01-01T00:00:00Z',
    tags: []
  }
}

// ─── Tests ─────────────────────────────────────────────────────────────────────

describe('PaperKeywordMatcher', () => {
  const matcher = new PaperKeywordMatcher()

  describe('match()', () => {
    it('Test 1: should rank relevant papers higher than less relevant ones', () => {
      const content = 'transformers and attention mechanisms'
      const results = matcher.match(content, samplePapers.slice(0, 2))

      expect(results.length).toBeGreaterThan(0)
      // p1 (Attention Is All You Need) should rank higher than p2 (BERT)
      const p1Result = results.find(r => r.paperId === 'p1')
      const p2Result = results.find(r => r.paperId === 'p2')
      expect(p1Result).toBeDefined()
      if (p1Result && p2Result) {
        expect(p1Result.relevanceScore).toBeGreaterThan(p2Result.relevanceScore)
      }
      // p1 should have "attention" in matchedKeywords
      if (p1Result) {
        expect(p1Result.matchedKeywords).toContain('attention')
      }
    })

    it('Test 2: should return empty array when no papers match content', () => {
      const content = 'quantum chromodynamics and flavored quarks'
      const results = matcher.match(content, samplePapers.slice(0, 2))

      expect(results).toEqual([])
    })

    it('Test 3: should return empty array for empty content', () => {
      const content = ''
      const results = matcher.match(content, samplePapers)

      expect(results).toEqual([])
    })

    it('Test 4: should return at most 5 results and complete in under 50ms for 50 papers', () => {
      // Create 50 papers
      const fiftyPapers: Paper[] = Array.from({ length: 50 }, (_, i) =>
        createPaper({
          id: `bulk-${i}`,
          title: `Paper ${i}: ${['machine learning', 'neural networks', 'deep learning', 'attention', 'transformer', 'computer vision', 'natural language', 'reinforcement'][i % 8]}`,
          abstract: `Research on ${['transformers', 'attention', 'deep learning', 'CNN', 'RNN', 'GAN', 'BERT', 'GPT'][i % 8]} and applications.`,
          authors: [`Author ${i}`],
          year: 2020 + (i % 5)
        })
      )

      const content = 'transformers and attention mechanisms in deep learning'
      const start = performance.now()
      const results = matcher.match(content, fiftyPapers)
      const duration = performance.now() - start

      expect(results.length).toBeLessThanOrEqual(5)
      expect(duration).toBeLessThan(50)
    })

    it('Test 5: extractKeywords should produce meaningful tokens without stopwords', () => {
      const content = 'Transformers use Attention mechanism. Vaswani introduced this.'
      const keywords = matcher.extractKeywords(content)

      // Should include meaningful words
      expect(keywords).toContain('transformers')
      expect(keywords).toContain('attention')
      expect(keywords).toContain('mechanism')
      expect(keywords).toContain('vaswani')
      expect(keywords).toContain('introduced')

      // Stopwords should be filtered
      expect(keywords).not.toContain('use')
      expect(keywords).not.toContain('this')
    })

    it('Test 6: case-insensitive matching', () => {
      const content = 'ATTENTION is important in TRANSFORMERS'
      const results = matcher.match(content, samplePapers.slice(0, 2))

      // Should still match papers despite case differences
      const p1Result = results.find(r => r.paperId === 'p1')
      expect(p1Result).toBeDefined()
      if (p1Result) {
        expect(p1Result.matchedKeywords).toContain('attention')
      }
    })
  })

  // ═══════════════════════════════════════════════════════════════════════════
  // Tier 2: LLM Semantic Re-rank Tests (Tests 7-11)
  // ═══════════════════════════════════════════════════════════════════════════

  describe('rerank() - Tier 2 LLM semantic re-rank', () => {
    const tier1Matches = [
      {
        paperId: 'p1',
        title: 'Attention Is All You Need',
        authors: ['Vaswani', 'Shazeer'],
        year: 2017,
        relevanceScore: 0.85,
        matchedKeywords: ['attention', 'transformer']
      },
      {
        paperId: 'p2',
        title: 'BERT: Pre-training of Deep Bidirectional Transformers',
        authors: ['Devlin', 'Chang'],
        year: 2019,
        relevanceScore: 0.6,
        matchedKeywords: ['transformer']
      }
    ]

    it('Test 7: should call providerChain.generateSuggestion exactly once', async () => {
      const mockProviderChain = {
        generateSuggestion: vi.fn().mockImplementation(async function* () {
          yield '{"index":1,"score":0.95,"rationale":"directly relevant"}'
          yield '\n{"index":2,"score":0.3,"rationale":"tangential"}'
        })
      }

      const content = 'transformers and attention mechanisms in deep learning'
      const signal = new AbortController().signal

      await matcher.rerank(mockProviderChain as any, content, tier1Matches, signal)

      expect(mockProviderChain.generateSuggestion).toHaveBeenCalledTimes(1)
    })

    it('Test 8: should return re-ordered PaperMatch[] with llmRelevanceScore and llmRationale', async () => {
      const mockProviderChain = {
        generateSuggestion: vi.fn().mockImplementation(async function* () {
          yield '{"index":1,"score":0.95,"rationale":"directly relevant to attention mechanisms"}'
          yield '\n{"index":2,"score":0.3,"rationale":"somewhat tangential to topic"}'
        })
      }

      const content = 'transformers and attention mechanisms in deep learning'
      const signal = new AbortController().signal

      const results = await matcher.rerank(mockProviderChain as any, content, tier1Matches, signal)

      expect(results.length).toBe(2)

      // Index 1 (originally p1) should have LLM score 0.95
      const p1Result = results.find(r => r.paperId === 'p1')
      expect(p1Result).toBeDefined()
      expect(p1Result!.llmRelevanceScore).toBe(0.95)
      expect(p1Result!.llmRationale).toBe('directly relevant to attention mechanisms')

      // Index 2 (originally p2) should have LLM score 0.3
      const p2Result = results.find(r => r.paperId === 'p2')
      expect(p2Result).toBeDefined()
      expect(p2Result!.llmRelevanceScore).toBe(0.3)
      expect(p2Result!.llmRationale).toBe('somewhat tangential to topic')

      // Results should be sorted by llmRelevanceScore descending
      expect(results[0].paperId).toBe('p1') // higher score first
    })

    it('Test 9: should return empty array for empty matches without calling providerChain', async () => {
      const mockProviderChain = {
        generateSuggestion: vi.fn()
      }

      const signal = new AbortController().signal
      const results = await matcher.rerank(mockProviderChain as any, 'some content', [], signal)

      expect(results).toEqual([])
      expect(mockProviderChain.generateSuggestion).not.toHaveBeenCalled()
    })

    it('Test 10: should return original Tier 1 matches on LLM error (graceful degradation)', async () => {
      const mockProviderChain = {
        generateSuggestion: vi.fn().mockImplementation(async function* () {
          throw new Error('LLM connection failed')
        })
      }

      const content = 'transformers and attention mechanisms'
      const signal = new AbortController().signal

      const results = await matcher.rerank(mockProviderChain as any, content, tier1Matches, signal)

      // Should return original matches unchanged
      expect(results.length).toBe(2)
      expect(results[0].paperId).toBe('p1')
      expect(results[0].relevanceScore).toBe(0.85)
      expect(results[1].paperId).toBe('p2')
      expect(results[1].relevanceScore).toBe(0.6)
    })

    it('Test 11: should enforce max 5 input papers for token budget', async () => {
      let capturedPrompt = ''

      const mockProviderChain = {
        generateSuggestion: vi.fn().mockImplementation(async function* (messages: any[]) {
          capturedPrompt = messages[1]?.content || ''
          yield '{"index":1,"score":0.9,"rationale":"relevant"}'
        })
      }

      // Create 10 tier1 matches
      const tenMatches = Array.from({ length: 10 }, (_, i) => ({
        paperId: `p${i}`,
        title: `Paper ${i}`,
        authors: [`Author ${i}`],
        year: 2020,
        relevanceScore: 0.9 - i * 0.05,
        matchedKeywords: ['test']
      }))

      const signal = new AbortController().signal
      await matcher.rerank(mockProviderChain as any, 'test content', tenMatches, signal)

      // Prompt should only include 5 papers (not 10)
      const paperCount = (capturedPrompt.match(/^\d+\./gm) || []).length
      expect(paperCount).toBe(5)

      // Prompt should not exceed roughly ~2000 chars
      expect(capturedPrompt.length).toBeLessThan(2500)
    })
  })
})
