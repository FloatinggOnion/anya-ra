import { describe, it, expect, beforeEach } from 'vitest'
import {
  generateCitation,
  formatAuthorName,
  formatPaperCitation,
  getCitationStyle,
  _resetFramingState,
} from './smart-citation-insert'
import type { Paper } from '../types/paper'
import type { CitationStyle, SidebarSuggestionItem } from '../types/suggestion'

// Helper to create a minimal Paper object for testing
function makePaper(overrides: Partial<Paper> = {}): Paper {
  return {
    id: 'test-1',
    source: 'local',
    externalId: 'test-1',
    title: 'Test Paper',
    authors: ['John Smith'],
    year: 2020,
    abstract: null,
    url: '',
    doi: null,
    arxivId: null,
    semanticId: null,
    isOpenAccess: false,
    openAccessStatus: null,
    pdfUrl: null,
    localPdfPath: null,
    pdfDownloaded: false,
    importedAt: new Date().toISOString(),
    addedAt: new Date().toISOString(),
    lastUpdated: new Date().toISOString(),
    tags: [],
    ...overrides,
  }
}

describe('formatAuthorName', () => {
  it('should return single surname for one author', () => {
    expect(formatAuthorName(['Smith'])).toBe('Smith')
  })

  it('should join two authors with "and"', () => {
    expect(formatAuthorName(['Smith', 'Jones'])).toBe('Smith and Jones')
  })

  it('should return "et al." for three or more authors', () => {
    expect(formatAuthorName(['Smith', 'Jones', 'Lee'])).toBe('Smith et al.')
  })

  it('should return "Unknown" for empty authors array', () => {
    expect(formatAuthorName([])).toBe('Unknown')
  })

  it('should handle full names by extracting surnames', () => {
    expect(formatAuthorName(['Jane Smith', 'Bob Jones'])).toBe('Smith and Jones')
  })
})

describe('formatPaperCitation', () => {
  beforeEach(() => {
    _resetFramingState()
  })

  it('should format author-year style correctly (Test 5)', () => {
    const paper = makePaper({
      title: 'Attention Is All You Need',
      authors: ['Ashish Vaswani', 'Noam Shazeer'],
      year: 2017,
    })
    const result = formatPaperCitation(paper, 'author-year')
    expect(result).toContain('As demonstrated by')
    expect(result).toContain('Vaswani and Shazeer')
    expect(result).toContain('(2017)')
    expect(result).toContain('[cite: Attention Is All You Need]')
  })

  it('should vary framing text on repeated citations of same paper (Test 6)', () => {
    const paper = makePaper({
      title: 'Attention Is All You Need',
      authors: ['Ashish Vaswani', 'Noam Shazeer'],
      year: 2017,
    })
    const first = formatPaperCitation(paper, 'author-year')
    const second = formatPaperCitation(paper, 'author-year')
    // First call should use "As demonstrated by" (index 0)
    expect(first).toContain('As demonstrated by')
    // Second call should use a DIFFERENT frame (index 1 = "As noted by")
    expect(second).toContain('As noted by')
    // Author+year+cite part should be identical
    const extractCore = (s: string) =>
      s.replace(/^(As demonstrated by|As noted by) /, '')
    expect(extractCore(first)).toBe(extractCore(second))
  })

  it('should format cite-title style correctly (Test 7)', () => {
    const paper = makePaper({ title: 'Attention Is All You Need' })
    const result = formatPaperCitation(paper, 'cite-title')
    expect(result).toBe(' [cite: Attention Is All You Need] ')
  })

  it('should format footnote style with 4 authors correctly (Test 8)', () => {
    const paper = makePaper({
      title: 'Attention Is All You Need',
      authors: ['John Smith', 'Jane Jones', 'Bob Lee', 'Alice Kim'],
      year: 2020,
    })
    const result = formatPaperCitation(paper, 'footnote')
    expect(result).toContain('Smith, Jones, Lee et al.')
    expect(result).toContain('(2020)')
    expect(result).toContain('"Attention Is All You Need"')
  })

  it('should handle null year in author-year style (Test 9)', () => {
    const paper = makePaper({
      title: 'Test',
      authors: ['John Smith'],
      year: null,
    })
    const result = formatPaperCitation(paper, 'author-year')
    expect(result).toContain('Smith')
    // No year parentheses for null year — but the plan says "no year parentheses, just a space"
    // Actually re-reading: starts with "As demonstrated by Smith [cite: Test], " (no year parentheses, just a space)
    // So it should contain "Smith" but NOT "(null)"
    expect(result).not.toContain('(null)')
    expect(result).not.toContain('()')
    expect(result).toContain('[cite: Test]')
  })
})

describe('generateCitation', () => {
  it('should return content + space for completion-type items (Test 10)', () => {
    const item: SidebarSuggestionItem = {
      id: 'comp-1',
      type: 'completion',
      label: 'Completion',
      content: 'This is a completion',
      timestamp: Date.now(),
      source: 'llm',
    }
    const result = generateCitation(item)
    expect(result).toBe('This is a completion ')
  })

  it('should return empty string for idea-type items (Test 11)', () => {
    const item: SidebarSuggestionItem = {
      id: 'idea-1',
      type: 'idea',
      label: 'Idea',
      content: 'An interesting research idea',
      timestamp: Date.now(),
      source: 'llm',
    }
    const result = generateCitation(item)
    expect(result).toBe('')
  })
})
