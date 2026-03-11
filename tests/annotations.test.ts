/**
 * Annotation store tests — CRUD operations on annotation store.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { get } from 'svelte/store'

describe('Annotation Store', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(async () => {
    // Reset store state after each test
    const { clearAnnotations, currentPage } = await import('../src/lib/stores/annotations')
    clearAnnotations()
    currentPage.set(1)
  })

  it('should be configured correctly', () => {
    expect(true).toBe(true)
  })

  it('should import annotation store without errors', async () => {
    const store = await import('../src/lib/stores/annotations')
    expect(store.annotations).toBeDefined()
    expect(store.selectedAnnotation).toBeDefined()
    expect(store.currentPage).toBeDefined()
  })

  it('should start with empty annotations', async () => {
    const { annotations } = await import('../src/lib/stores/annotations')
    expect(get(annotations)).toHaveLength(0)
  })

  it('should add an annotation', async () => {
    const { annotations, addAnnotation } = await import('../src/lib/stores/annotations')
    const ann = {
      id: 'test-1',
      type: 'highlight' as const,
      page: 1,
      rects: [{ x: 10, y: 20, width: 100, height: 15 }],
      color: 'yellow' as const,
      selectedText: 'Hello',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
    addAnnotation(ann)
    expect(get(annotations)).toHaveLength(1)
    expect(get(annotations)[0].id).toBe('test-1')
  })

  it('should skip duplicate annotation ids', async () => {
    const { annotations, addAnnotation, clearAnnotations } = await import('../src/lib/stores/annotations')
    clearAnnotations()
    const ann = {
      id: 'dup-1',
      type: 'highlight' as const,
      page: 1,
      rects: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
    addAnnotation(ann)
    addAnnotation(ann)
    expect(get(annotations)).toHaveLength(1)
  })

  it('should update an annotation', async () => {
    const { annotations, addAnnotation, updateAnnotation, clearAnnotations } = await import('../src/lib/stores/annotations')
    clearAnnotations()
    addAnnotation({
      id: 'upd-1',
      type: 'highlight' as const,
      page: 1,
      rects: [],
      note: 'original',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    })
    updateAnnotation('upd-1', { note: 'updated' })
    const found = get(annotations).find((a) => a.id === 'upd-1')
    expect(found?.note).toBe('updated')
  })

  it('should delete an annotation', async () => {
    const { annotations, addAnnotation, deleteAnnotation, clearAnnotations } = await import('../src/lib/stores/annotations')
    clearAnnotations()
    addAnnotation({
      id: 'del-1',
      type: 'sticky' as const,
      page: 2,
      rects: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    })
    deleteAnnotation('del-1')
    expect(get(annotations).find((a) => a.id === 'del-1')).toBeUndefined()
  })

  it('should clear all annotations', async () => {
    const { annotations, addAnnotation, clearAnnotations } = await import('../src/lib/stores/annotations')
    addAnnotation({
      id: 'clr-1', type: 'highlight' as const, page: 1, rects: [],
      createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
    })
    clearAnnotations()
    expect(get(annotations)).toHaveLength(0)
  })
})
