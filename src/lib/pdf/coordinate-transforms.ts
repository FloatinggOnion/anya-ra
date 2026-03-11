/**
 * PDF ↔ Canvas coordinate transformation utilities.
 *
 * PDF coordinate system: origin bottom-left, Y increases upward.
 * Canvas coordinate system: origin top-left, Y increases downward.
 *
 * Transform formula:
 *   canvasX = pdfX * scale
 *   canvasY = (rawPageHeight - pdfY - pdfRectHeight) * scale
 *
 * Inverse:
 *   pdfX = canvasX / scale
 *   pdfY = rawPageHeight - (canvasY / scale) - (canvasRectHeight / scale)
 */

import type { Rect, PDFViewport } from '../types/annotation'

/**
 * Transform a rectangle from PDF coordinate space to canvas coordinate space.
 *
 * @param pdfRect - Rectangle in PDF units (bottom-left origin, Y up)
 * @param viewport - PDF viewport with scale and raw dimensions
 * @returns Rectangle in canvas pixels (top-left origin, Y down)
 */
export function transformPdfToCanvas(pdfRect: Rect, viewport: PDFViewport): Rect {
  const { scale } = viewport
  // Use rawHeight if available, otherwise derive from scaled height
  const rawHeight = viewport.rawHeight ?? viewport.height / scale

  return {
    x: pdfRect.x * scale,
    // Y inversion: flip from bottom-left to top-left origin
    y: (rawHeight - pdfRect.y - pdfRect.height) * scale,
    width: pdfRect.width * scale,
    height: pdfRect.height * scale,
  }
}

/**
 * Transform a rectangle from canvas coordinate space back to PDF coordinate space.
 * Inverse of transformPdfToCanvas.
 *
 * @param canvasRect - Rectangle in canvas pixels (top-left origin, Y down)
 * @param viewport - PDF viewport with scale and raw dimensions
 * @returns Rectangle in PDF units (bottom-left origin, Y up)
 */
export function transformCanvasToPdf(canvasRect: Rect, viewport: PDFViewport): Rect {
  const { scale } = viewport
  const rawHeight = viewport.rawHeight ?? viewport.height / scale

  const pdfWidth = canvasRect.width / scale
  const pdfHeight = canvasRect.height / scale

  return {
    x: canvasRect.x / scale,
    // Invert Y: undo the bottom-left to top-left flip
    y: rawHeight - (canvasRect.y / scale) - pdfHeight,
    width: pdfWidth,
    height: pdfHeight,
  }
}

/**
 * Transform an array of PDF rects to canvas rects (batch transform).
 */
export function transformRectsToCanvas(pdfRects: Rect[], viewport: PDFViewport): Rect[] {
  return pdfRects.map((r) => transformPdfToCanvas(r, viewport))
}

/**
 * Transform an array of canvas rects to PDF rects (batch inverse transform).
 */
export function transformRectsToPdf(canvasRects: Rect[], viewport: PDFViewport): Rect[] {
  return canvasRects.map((r) => transformCanvasToPdf(r, viewport))
}

/**
 * Get a DOMRect-relative bounding box in PDF coordinates.
 * Used when converting browser Selection API rects to PDF space.
 *
 * @param clientRect - DOMRect from Range.getClientRects() or getBoundingClientRect()
 * @param containerRect - Bounding rect of the canvas/container element
 * @param viewport - PDF viewport
 */
export function clientRectToPdf(
  clientRect: DOMRect,
  containerRect: DOMRect,
  viewport: PDFViewport
): Rect {
  // First convert client rect to canvas-relative rect
  const canvasRect: Rect = {
    x: clientRect.left - containerRect.left,
    y: clientRect.top - containerRect.top,
    width: clientRect.width,
    height: clientRect.height,
  }
  return transformCanvasToPdf(canvasRect, viewport)
}
