/**
 * Text selection handler tests — Selection API mocking, rect extraction.
 * Tests use jsdom Selection API (from tests/setup.ts).
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'

describe('Text Selection Handler', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    document.body.innerHTML = ''
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('should be configured correctly', () => {
    expect(true).toBe(true)
  })

  it('should import TextSelectionHandler without errors', async () => {
    const { TextSelectionHandler } = await import('../src/lib/pdf/text-selection')
    expect(TextSelectionHandler).toBeDefined()
    expect(typeof TextSelectionHandler).toBe('function')
  })

  it('should create handler instance', async () => {
    const { TextSelectionHandler } = await import('../src/lib/pdf/text-selection')
    const handler = new TextSelectionHandler()
    expect(handler).toBeDefined()
  })

  it('should return empty selection when nothing is selected', async () => {
    const { TextSelectionHandler } = await import('../src/lib/pdf/text-selection')
    const handler = new TextSelectionHandler()
    const selection = handler.getSelection()
    expect(selection.text).toBe('')
    expect(selection.rects).toHaveLength(0)
  })

  it('should clear selection', async () => {
    const { TextSelectionHandler } = await import('../src/lib/pdf/text-selection')
    const handler = new TextSelectionHandler()
    handler.clearSelection()
    const selection = handler.getSelection()
    expect(selection.text).toBe('')
    expect(selection.rects).toHaveLength(0)
  })
})
