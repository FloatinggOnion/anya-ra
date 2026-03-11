/**
 * Coordinate transform tests — PDF ↔ Canvas coordinate mapping.
 * Uses TDD: these tests drive implementation of coordinate-transforms.ts
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { transformPdfToCanvas, transformCanvasToPdf } from '../src/lib/pdf/coordinate-transforms'
import type { Rect, PDFViewport } from '../src/lib/types/annotation'

const makeViewport = (scale: number, height: number = 1100): PDFViewport => ({
  width: 800 * scale,
  height: height * scale,
  scale,
  rawWidth: 800,
  rawHeight: height,
})

describe('Coordinate Transforms', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should be configured correctly', () => {
    expect(true).toBe(true)
  })

  describe('transformPdfToCanvas', () => {
    it('should apply scale factor to all dimensions', () => {
      const viewport = makeViewport(1.5)
      const pdfRect: Rect = { x: 10, y: 100, width: 200, height: 20 }
      const result = transformPdfToCanvas(pdfRect, viewport)
      expect(result.width).toBeCloseTo(300) // 200 * 1.5
      expect(result.height).toBeCloseTo(30) // 20 * 1.5
    })

    it('should invert Y axis (PDF bottom-left to canvas top-left)', () => {
      const viewport = makeViewport(1.0)
      // PDF rect at bottom (y=0), should be near bottom in canvas (y = height - height)
      const pdfRect: Rect = { x: 0, y: 0, width: 100, height: 50 }
      const result = transformPdfToCanvas(pdfRect, viewport)
      // canvasY = (rawHeight - pdfY - pdfHeight) * scale = (1100 - 0 - 50) * 1 = 1050
      expect(result.y).toBeCloseTo(1050)
    })

    it('should place rect at top of canvas when PDF rect is at top', () => {
      const viewport = makeViewport(1.0)
      // PDF rect near top (y = pageHeight - rectHeight = 1050)
      const pdfRect: Rect = { x: 0, y: 1050, width: 100, height: 50 }
      const result = transformPdfToCanvas(pdfRect, viewport)
      // canvasY = (1100 - 1050 - 50) * 1 = 0
      expect(result.y).toBeCloseTo(0)
    })

    it('should handle scale 2.0', () => {
      const viewport = makeViewport(2.0)
      const pdfRect: Rect = { x: 100, y: 200, width: 50, height: 10 }
      const result = transformPdfToCanvas(pdfRect, viewport)
      expect(result.x).toBeCloseTo(200) // 100 * 2
      expect(result.width).toBeCloseTo(100) // 50 * 2
      expect(result.height).toBeCloseTo(20) // 10 * 2
    })

    it('should preserve floating-point precision', () => {
      const viewport = makeViewport(1.5)
      const pdfRect: Rect = { x: 33.333, y: 66.667, width: 133.333, height: 16.667 }
      const result = transformPdfToCanvas(pdfRect, viewport)
      // Should not be integer-rounded
      expect(result.x).toBeCloseTo(49.9995, 2)
      expect(result.width).toBeCloseTo(199.9995, 2)
    })
  })

  describe('transformCanvasToPdf', () => {
    it('should invert PDF-to-canvas transform (round-trip)', () => {
      const viewport = makeViewport(1.5)
      const originalPdfRect: Rect = { x: 50, y: 200, width: 150, height: 25 }
      const canvasRect = transformPdfToCanvas(originalPdfRect, viewport)
      const roundTrip = transformCanvasToPdf(canvasRect, viewport)
      expect(roundTrip.x).toBeCloseTo(originalPdfRect.x, 2)
      expect(roundTrip.y).toBeCloseTo(originalPdfRect.y, 2)
      expect(roundTrip.width).toBeCloseTo(originalPdfRect.width, 2)
      expect(roundTrip.height).toBeCloseTo(originalPdfRect.height, 2)
    })

    it('should divide by scale factor', () => {
      const viewport = makeViewport(2.0)
      const canvasRect: Rect = { x: 200, y: 0, width: 100, height: 20 }
      const result = transformCanvasToPdf(canvasRect, viewport)
      expect(result.x).toBeCloseTo(100) // 200 / 2
      expect(result.width).toBeCloseTo(50) // 100 / 2
      expect(result.height).toBeCloseTo(10) // 20 / 2
    })
  })

  describe('round-trip accuracy', () => {
    it('should pass round-trip at scale 1.0 with precision < 0.01', () => {
      const viewport = makeViewport(1.0)
      const rects: Rect[] = [
        { x: 10, y: 50, width: 200, height: 12 },
        { x: 100, y: 500, width: 300, height: 20 },
        { x: 0, y: 0, width: 800, height: 1100 },
      ]
      for (const rect of rects) {
        const canvas = transformPdfToCanvas(rect, viewport)
        const back = transformCanvasToPdf(canvas, viewport)
        expect(Math.abs(back.x - rect.x)).toBeLessThan(0.01)
        expect(Math.abs(back.y - rect.y)).toBeLessThan(0.01)
        expect(Math.abs(back.width - rect.width)).toBeLessThan(0.01)
        expect(Math.abs(back.height - rect.height)).toBeLessThan(0.01)
      }
    })
  })
})
