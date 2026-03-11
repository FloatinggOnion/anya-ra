/**
 * Text selection handler for PDF text layer.
 * Intercepts browser Selection API to extract bounding rectangles in PDF coordinates.
 */
import type { Rect, PDFViewport } from '../types/annotation'
import { clientRectToPdf } from './coordinate-transforms'

export interface SelectionResult {
  text: string
  rects: Rect[]
}

/**
 * Handles text selection events on the PDF text layer and extracts
 * bounding rectangles in PDF coordinate space.
 */
export class TextSelectionHandler {
  private textLayer: HTMLElement | null = null
  private selectedRects: Rect[] = []
  private selectedText: string = ''
  private viewport: PDFViewport | null = null
  private boundHandler: () => void

  constructor() {
    this.boundHandler = this.onTextSelection.bind(this)
  }

  /**
   * Attach handler to a container element by its DOM id.
   * @param containerId - ID of the text layer container element
   * @param viewport - Current PDF viewport for coordinate conversion
   */
  attachToTextLayer(containerId: string, viewport: PDFViewport): void {
    this.detach()
    const el = document.getElementById(containerId)
    if (!el) return
    this.textLayer = el
    this.viewport = viewport
    document.addEventListener('mouseup', this.boundHandler)
  }

  /**
   * Attach handler directly to an element (for use when element reference is available).
   */
  attachToElement(el: HTMLElement, viewport: PDFViewport): void {
    this.detach()
    this.textLayer = el
    this.viewport = viewport
    document.addEventListener('mouseup', this.boundHandler)
  }

  /**
   * Update the viewport (e.g. after zoom).
   */
  updateViewport(viewport: PDFViewport): void {
    this.viewport = viewport
  }

  /**
   * Internal mouseup handler. Extracts selection rects in PDF coordinates.
   */
  private onTextSelection(): void {
    if (!this.textLayer || !this.viewport) return

    const selection = window.getSelection()
    if (!selection || selection.rangeCount === 0 || selection.isCollapsed) {
      // Empty/collapsed selection — keep previous or clear
      return
    }

    const range = selection.getRangeAt(0)
    const text = selection.toString().trim()

    // Verify selection is within our text layer
    if (!this.textLayer.contains(range.commonAncestorContainer)) {
      return
    }

    if (!text) {
      this.selectedText = ''
      this.selectedRects = []
      return
    }

    // Get client rects for multi-line selection support
    const clientRects = Array.from(range.getClientRects())
    const containerRect = this.textLayer.getBoundingClientRect()

    // Filter out zero-area rects and convert to PDF coordinates
    this.selectedRects = clientRects
      .filter((r) => r.width > 0 && r.height > 0)
      .map((r) => clientRectToPdf(r, containerRect, this.viewport!))

    this.selectedText = text
  }

  /**
   * Get the current selection result.
   * @returns Object with selected text and rects in PDF coordinate space
   */
  getSelection(): SelectionResult {
    return {
      text: this.selectedText,
      rects: [...this.selectedRects],
    }
  }

  /**
   * Clear the current selection state.
   */
  clearSelection(): void {
    this.selectedText = ''
    this.selectedRects = []
    window.getSelection()?.removeAllRanges()
  }

  /**
   * Remove event listeners and detach from element.
   */
  detach(): void {
    document.removeEventListener('mouseup', this.boundHandler)
    this.textLayer = null
    this.viewport = null
  }
}
