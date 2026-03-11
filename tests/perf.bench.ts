/**
 * Performance benchmarks — page render time, cache hit/miss, RAF throttling.
 * Run with: pnpm run test:bench
 */
import { bench, describe, expect } from 'vitest'

describe('Page Render Performance', () => {
  bench('coordinate transform PDF→Canvas', async () => {
    const { transformPdfToCanvas } = await import('../src/lib/pdf/coordinate-transforms')
    const viewport = { width: 800, height: 1100, scale: 1.5, rawWidth: 800, rawHeight: 1100 }
    const rect = { x: 100, y: 200, width: 300, height: 20 }
    transformPdfToCanvas(rect, viewport)
  })

  bench('coordinate transform round-trip', async () => {
    const { transformPdfToCanvas, transformCanvasToPdf } = await import('../src/lib/pdf/coordinate-transforms')
    const viewport = { width: 800, height: 1100, scale: 1.5, rawWidth: 800, rawHeight: 1100 }
    const rect = { x: 100, y: 200, width: 300, height: 20 }
    const canvas = transformPdfToCanvas(rect, viewport)
    transformCanvasToPdf(canvas, viewport)
  })
})

describe('Cache Performance', () => {
  bench('LRU cache lookup (simulated hit)', () => {
    const cache = new Map<number, string>()
    // Populate cache
    for (let i = 1; i <= 10; i++) {
      cache.set(i, `canvas-page-${i}`)
    }
    // Hit
    const result = cache.get(5)
    expect(result).toBe('canvas-page-5')
  })
})

describe('Annotation Rendering Performance', () => {
  bench('filter annotations to current page', () => {
    const annotations = Array.from({ length: 100 }, (_, i) => ({
      id: `ann-${i}`,
      type: 'highlight' as const,
      page: (i % 10) + 1,
      rects: [{ x: 10, y: 20, width: 100, height: 15 }],
      createdAt: '',
      updatedAt: '',
    }))
    const currentPage = 3
    const filtered = annotations.filter((a) => a.page === currentPage)
    expect(filtered.length).toBeGreaterThan(0)
  })
})
