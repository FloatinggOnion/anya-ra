/**
 * LRU Page Cache — caches pre-rendered PDF page canvases.
 * Renders current page + ±2 adjacent pages. Max 10 pages cached.
 * Eviction: Least Recently Used (LRU) when cache reaches MAX_CACHE.
 */
import type { PDFViewport } from '../types/annotation'

interface CachedPage {
  canvas: HTMLCanvasElement
  scale: number
  lastUsed: number
}

// Type-only import to avoid circular dep with actual PDF.js types at runtime
interface PDFPage {
  pageNumber: number
  getViewport(options: { scale: number }): { width: number; height: number; scale: number }
  render(options: { canvasContext: CanvasRenderingContext2D; viewport: unknown }): {
    promise: Promise<void>
  }
  cleanup(): void
}

interface PDFDocument {
  numPages: number
  getPage(num: number): Promise<PDFPage>
}

export class PageCache {
  private cache = new Map<string, CachedPage>()
  private readonly MAX_CACHE = 10

  private cacheKey(pageNum: number, scale: number): string {
    return `${pageNum}@${scale.toFixed(3)}`
  }

  /**
   * Get a cached canvas for the given page+scale, or render it and cache the result.
   */
  async renderPage(
    pdf: PDFDocument,
    pageNum: number,
    scale: number
  ): Promise<{ canvas: HTMLCanvasElement; viewport: PDFViewport }> {
    const key = this.cacheKey(pageNum, scale)

    if (this.cache.has(key)) {
      const cached = this.cache.get(key)!
      cached.lastUsed = Date.now()
      const page = await pdf.getPage(pageNum)
      const vp = page.getViewport({ scale })
      return {
        canvas: cached.canvas,
        viewport: {
          width: vp.width,
          height: vp.height,
          scale: vp.scale,
          rawWidth: vp.width / scale,
          rawHeight: vp.height / scale,
        },
      }
    }

    // Cache miss — render the page
    const result = await this.doRender(pdf, pageNum, scale)
    this.set(key, result.canvas, scale)
    return result
  }

  private async doRender(
    pdf: PDFDocument,
    pageNum: number,
    scale: number
  ): Promise<{ canvas: HTMLCanvasElement; viewport: PDFViewport }> {
    const page = await pdf.getPage(pageNum)
    const vp = page.getViewport({ scale })

    const canvas = document.createElement('canvas')
    canvas.width = Math.floor(vp.width)
    canvas.height = Math.floor(vp.height)

    const ctx = canvas.getContext('2d')
    if (ctx) {
      await page.render({ canvasContext: ctx, viewport: vp }).promise
    }

    page.cleanup()

    const viewport: PDFViewport = {
      width: vp.width,
      height: vp.height,
      scale: vp.scale,
      rawWidth: vp.width / scale,
      rawHeight: vp.height / scale,
    }

    return { canvas, viewport }
  }

  private set(key: string, canvas: HTMLCanvasElement, scale: number): void {
    if (this.cache.size >= this.MAX_CACHE) {
      this.evictOldest()
    }
    this.cache.set(key, { canvas, scale, lastUsed: Date.now() })
  }

  private evictOldest(): void {
    let oldestKey: string | null = null
    let oldestTime = Infinity

    for (const [key, entry] of this.cache) {
      if (entry.lastUsed < oldestTime) {
        oldestTime = entry.lastUsed
        oldestKey = key
      }
    }

    if (oldestKey) {
      this.cache.delete(oldestKey)
    }
  }

  /**
   * Pre-render adjacent pages (±2) in the background.
   * Does not await — fire and forget.
   */
  prefetchAdjacent(pdf: PDFDocument, currentPage: number, scale: number): void {
    const total = pdf.numPages
    const adjacent = [-2, -1, 1, 2]
    for (const delta of adjacent) {
      const page = currentPage + delta
      if (page >= 1 && page <= total) {
        const key = this.cacheKey(page, scale)
        if (!this.cache.has(key)) {
          // Background prefetch — don't await
          this.doRender(pdf, page, scale)
            .then(({ canvas }) => this.set(key, canvas, scale))
            .catch(() => {
              /* ignore prefetch errors */
            })
        }
      }
    }
  }

  /**
   * Check if a page is currently in cache.
   */
  has(pageNum: number, scale: number): boolean {
    return this.cache.has(this.cacheKey(pageNum, scale))
  }

  /**
   * Get the current number of cached pages.
   */
  get size(): number {
    return this.cache.size
  }

  /**
   * Clear all cached pages.
   */
  clear(): void {
    this.cache.clear()
  }

  /**
   * Invalidate cache for a specific scale (e.g. after zoom change).
   */
  invalidateScale(scale: number): void {
    const prefix = `@${scale.toFixed(3)}`
    for (const key of this.cache.keys()) {
      if (key.endsWith(prefix)) {
        this.cache.delete(key)
      }
    }
  }
}
