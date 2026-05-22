import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { SectionBoundaryDetector } from './section-boundary-detector'
import type { SectionBoundaryEvent } from '../types/suggestion'

// ═══════════════════════════════════════════════════════════════════════════════
// SectionBoundaryDetector Tests (Tests 1-5)
// ═══════════════════════════════════════════════════════════════════════════════

describe('SectionBoundaryDetector', () => {
  let callback: ReturnType<typeof vi.fn>
  let _content: string
  let detector: SectionBoundaryDetector

  beforeEach(() => {
    vi.useFakeTimers()
    callback = vi.fn()
    _content = ''
    detector = new SectionBoundaryDetector(
      (event: SectionBoundaryEvent) => callback(event),
      () => _content,
      () => 'test-doc-1'
    )
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('Test 1: should fire callback on double-newline + 500ms pause with correct sectionText', () => {
    _content = 'hello world\n\n'
    detector.onContentChange(12) // cursor at end of content

    // Before 500ms, callback should NOT be called
    vi.advanceTimersByTime(400)
    expect(callback).not.toHaveBeenCalled()

    // After 500ms total, callback should fire
    vi.advanceTimersByTime(100)
    expect(callback).toHaveBeenCalledTimes(1)

    const event = callback.mock.calls[0][0] as SectionBoundaryEvent
    expect(event.docId).toBe('test-doc-1')
    expect(event.sectionText).toBe('hello world')
    expect(event.cursorPos).toBe(12)
    expect(event.timestamp).toBeGreaterThan(0)
  })

  it('Test 2: should NOT fire callback on single newline (no boundary)', () => {
    _content = 'hello\nworld'
    detector.onContentChange(12)

    vi.advanceTimersByTime(600)
    expect(callback).not.toHaveBeenCalled()
  })

  it('Test 3: should reset debounce timer on rapid typing', () => {
    // Type content ending with \n\n
    _content = 'abc\n\n'
    detector.onContentChange(5)

    // Type more characters within 400ms (before debounce fires)
    vi.advanceTimersByTime(200)
    _content = 'abc\n\ndef'
    detector.onContentChange(8)

    // Even after 600ms from first call, callback should NOT fire
    // because the debounce was reset
    vi.advanceTimersByTime(400)
    expect(callback).not.toHaveBeenCalled()

    // After 500ms from the SECOND call (total 700ms from first):
    vi.advanceTimersByTime(100)
    // Content no longer ends with \n\n, so still no callback
    expect(callback).not.toHaveBeenCalled()
  })

  it('Test 4: cleanup() should cancel pending timer', () => {
    _content = 'test\n\n'
    detector.onContentChange(6)

    // Cleanup before timer fires
    vi.advanceTimersByTime(100)
    detector.cleanup()

    // After 500ms, callback should NOT fire (timer was cancelled)
    vi.advanceTimersByTime(500)
    expect(callback).not.toHaveBeenCalled()
  })

  it('Test 5: triggerManual() should fire immediately regardless of content', () => {
    _content = 'just some text without double newline'
    detector.triggerManual(5)

    // Should fire immediately (no debounce)
    expect(callback).toHaveBeenCalledTimes(1)

    const event = callback.mock.calls[0][0] as SectionBoundaryEvent
    expect(event.docId).toBe('test-doc-1')
    expect(event.sectionText).toBe('just some text without double newline')
  })
})

// ═══════════════════════════════════════════════════════════════════════════════
// SuggestionSidebarStore Test (Test 6)
// ═══════════════════════════════════════════════════════════════════════════════

describe('SuggestionSidebarStore', () => {
  it('Test 6: setPaperMatches should populate sidebarPapers with correct SidebarSuggestionItem array', async () => {
    const { setPaperMatches, sidebarPapers } = await import('../stores/suggestion-sidebar')

    const matches = [
      {
        paperId: 'p1',
        title: 'Attention Is All You Need',
        authors: ['Vaswani', 'Shazeer', 'Parmar'],
        year: 2017,
        relevanceScore: 0.95,
        matchedKeywords: ['attention', 'transformer']
      },
      {
        paperId: 'p2',
        title: 'BERT Model',
        authors: ['Devlin', 'Chang'],
        year: 2019,
        relevanceScore: 0.6,
        matchedKeywords: ['bert']
      }
    ]

    setPaperMatches(matches)

    const papers = sidebarPapers.current
    expect(papers.length).toBe(2)

    // Check first item
    expect(papers[0].type).toBe('paper')
    expect(papers[0].source).toBe('paper-keyword')
    expect(papers[0].label).toBe('Papers')
    expect(papers[0].paper?.title).toBe('Attention Is All You Need')
    expect(papers[0].paper?.relevanceScore).toBe(0.95)

    // Check second item
    expect(papers[1].type).toBe('paper')
    expect(papers[1].source).toBe('paper-keyword')
    expect(papers[1].paper?.title).toBe('BERT Model')
    expect(papers[1].paper?.relevanceScore).toBe(0.6)
  })
})

// ═══════════════════════════════════════════════════════════════════════════════
// SuggestionService Tests (Tests 7-8)
// ═══════════════════════════════════════════════════════════════════════════════

describe('SuggestionService - generateIdeas & generateCompletions', () => {
  it('Test 7: generateIdeas() should call providerChain with research writing assistant prompt', async () => {
    const { SuggestionService } = await import('./suggestions')

    const mockProviderChain = {
      generateSuggestion: vi.fn().mockImplementation(async function* () {
        yield '• Consider discussing the ethical implications of this approach'
        yield '\n• A counterargument could be that the sample size is too small'
        yield '\n• Follow-up question: how would this scale to larger datasets?'
      })
    }

    const service = new SuggestionService(mockProviderChain as any)

    const results = await service.generateIdeas('doc-1', 'This is some document text about AI', 42)

    // Verify providerChain was called
    expect(mockProviderChain.generateSuggestion).toHaveBeenCalledTimes(1)

    // Verify system prompt contains research writing assistant
    const callArgs = mockProviderChain.generateSuggestion.mock.calls[0]
    const messages = callArgs[0]
    const systemMsg = messages.find((m: any) => m.role === 'system')
    expect(systemMsg).toBeDefined()
    expect(systemMsg.content).toContain('research writing assistant')
    expect(systemMsg.content).toContain('ideas, counterarguments, or follow-up questions')

    // Verify results
    expect(results.length).toBe(3)
    expect(results[0].type).toBe('idea')
    expect(results[0].source).toBe('llm')
    expect(results[0].content).toContain('ethical implications')
  })

  it('Test 8: generateCompletions() should call providerChain with writing assistant prompt', async () => {
    const { SuggestionService } = await import('./suggestions')

    const mockProviderChain = {
      generateSuggestion: vi.fn().mockImplementation(async function* () {
        yield 'This approach has been validated by several studies in the field.'
        yield '\nFurthermore, recent advances suggest promising directions for future research.'
      })
    }

    const service = new SuggestionService(mockProviderChain as any)

    const results = await service.generateCompletions('doc-1', 'The results indicate a strong correlation', 50)

    // Verify providerChain was called
    expect(mockProviderChain.generateSuggestion).toHaveBeenCalledTimes(1)

    // Verify system prompt contains writing assistant
    const callArgs = mockProviderChain.generateSuggestion.mock.calls[0]
    const messages = callArgs[0]
    const systemMsg = messages.find((m: any) => m.role === 'system')
    expect(systemMsg).toBeDefined()
    expect(systemMsg.content).toContain('writing assistant')
    expect(systemMsg.content).toContain('sentence continuations')

    // Verify results
    expect(results.length).toBe(2)
    expect(results[0].type).toBe('completion')
    expect(results[0].source).toBe('llm')
    expect(results[0].content).toContain('validated by several studies')
  })
})
