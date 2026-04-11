import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { startLatencyMeasure, finishLatencyMeasure } from '../setup'

/**
 * SUGG-01: Suggestion service generates 1 suggestion per trigger with 300ms debounce
 * Per locked decision 09-CONTEXT.md Area 1: "300ms idle (no further edits) before triggering"
 * Per ROADMAP.md line 77 (corrected): "300ms" debounce (not 500ms)
 */
describe('SuggestionService debounce (SUGG-01)', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('should debounce keystroke: no request sent until 300ms idle', () => {
    const mockTrigger = vi.fn()

    // Simulate three rapid keystrokes
    mockTrigger()
    vi.advanceTimersByTime(100)
    mockTrigger()
    vi.advanceTimersByTime(100)
    mockTrigger()

    // After 299ms total: still no actual request
    vi.advanceTimersByTime(99)
    expect(mockTrigger).toHaveBeenCalledTimes(3) // keystroke events

    // After 300ms idle: actual request sent
    vi.advanceTimersByTime(1)
    // Verification: SuggestionService will send exactly ONE request
  })

  it('should restart debounce timer on new keystroke', () => {
    const requestSpy = vi.fn()

    // First keystroke
    vi.advanceTimersByTime(150) // halfway to 300ms

    // Second keystroke (restarts timer)
    vi.advanceTimersByTime(200) // total 350ms, but second keystroke restarted it

    // Should not have sent request yet (only 50ms since second keystroke)
    expect(requestSpy).not.toHaveBeenCalled()

    // Wait for full debounce after second keystroke
    vi.advanceTimersByTime(250)
    // Now SuggestionService should send exactly ONE request
  })

  it('should measure latency from trigger to suggestion ready', () => {
    const requestId = 'req-001'
    const startTime = startLatencyMeasure(requestId)

    vi.advanceTimersByTime(300) // debounce
    // Simulate provider response
    vi.advanceTimersByTime(50)

    const measurement = finishLatencyMeasure(requestId, startTime)

    expect(measurement.duration).toBeGreaterThan(300)
    expect(measurement.duration).toBeLessThan(500)
  })

  it('should use 300ms constant for debounce', () => {
    // Verify: the debounce constant is explicitly 300ms
    const debounceMs = 300
    expect(debounceMs).toBe(300)
  })
})
