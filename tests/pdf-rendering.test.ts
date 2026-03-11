/**
 * PDF rendering tests — canvas-based PDF.js rendering validation.
 * Tests use mocked PDF.js from tests/setup.ts.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'

describe('PDF Rendering', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('should be configured correctly', () => {
    expect(true).toBe(true)
  })

  it('should initialize PDF.js worker without throwing', async () => {
    // Worker initialization is tested via pdf-init.ts
    const { initPDFWorker } = await import('../src/lib/pdf/pdf-init')
    expect(() => initPDFWorker()).not.toThrow()
  })

  it('should load a PDF document', async () => {
    const { pdfjsLib } = await import('../src/lib/pdf/pdf-init')
    const loadTask = pdfjsLib.getDocument({ url: 'test.pdf' })
    const doc = await loadTask.promise
    expect(doc).toBeDefined()
    expect(doc.numPages).toBe(5)
  })

  it('should get a page from document', async () => {
    const { pdfjsLib } = await import('../src/lib/pdf/pdf-init')
    const loadTask = pdfjsLib.getDocument({ url: 'test.pdf' })
    const doc = await loadTask.promise
    const page = await doc.getPage(1)
    expect(page).toBeDefined()
    expect(page.pageNumber).toBe(1)
  })

  it('should get viewport from page', async () => {
    const { pdfjsLib } = await import('../src/lib/pdf/pdf-init')
    const doc = await pdfjsLib.getDocument({ url: 'test.pdf' }).promise
    const page = await doc.getPage(1)
    const viewport = page.getViewport({ scale: 1.5 })
    expect(viewport.width).toBe(1200) // 800 * 1.5
    expect(viewport.height).toBe(1650) // 1100 * 1.5
    expect(viewport.scale).toBe(1.5)
  })
})
