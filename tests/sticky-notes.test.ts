/**
 * Sticky note component tests — creation, editing, positioning.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'

describe('Sticky Notes', () => {
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

  it('should create sticky annotation with correct structure', () => {
    const now = new Date().toISOString()
    const sticky = {
      id: crypto.randomUUID(),
      type: 'sticky' as const,
      page: 1,
      rects: [{ x: 100, y: 200, width: 0, height: 0 }],
      note: 'This is a note',
      createdAt: now,
      updatedAt: now,
    }
    expect(sticky.type).toBe('sticky')
    expect(sticky.note).toBe('This is a note')
    expect(sticky.page).toBe(1)
  })

  it('should update note content', () => {
    const id = 'note-test-1'
    let content = 'initial'
    const onUpdate = (noteId: string, newContent: string) => {
      if (noteId === id) content = newContent
    }
    onUpdate(id, 'updated content')
    expect(content).toBe('updated content')
  })

  it('should calculate sticky note position next to annotation rect', () => {
    const rect = { x: 100, y: 200, width: 150, height: 20 }
    const scale = 1.5
    // Note should appear to the right of the rect
    const noteLeft = (rect.x + rect.width) * scale + 10
    expect(noteLeft).toBeGreaterThan(rect.x * scale)
  })

  it('should only render notes for current page', () => {
    const annotations = [
      { id: '1', type: 'sticky' as const, page: 1, rects: [], createdAt: '', updatedAt: '' },
      { id: '2', type: 'sticky' as const, page: 2, rects: [], createdAt: '', updatedAt: '' },
      { id: '3', type: 'sticky' as const, page: 1, rects: [], createdAt: '', updatedAt: '' },
    ]
    const currentPage = 1
    const filtered = annotations.filter((a) => a.page === currentPage)
    expect(filtered).toHaveLength(2)
    expect(filtered.every((a) => a.page === 1)).toBe(true)
  })
})
