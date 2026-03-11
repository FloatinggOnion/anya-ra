/**
 * ViewportManager — throttles zoom and scroll updates using requestAnimationFrame.
 * Ensures 60fps by batching rapid updates into single frame callbacks.
 */

export interface ViewportState {
  scale: number
  scrollTop: number
  scrollLeft: number
}

export type ViewportUpdateCallback = (state: ViewportState) => void

const ZOOM_LEVELS = [0.5, 0.75, 1.0, 1.25, 1.5, 1.75, 2.0, 2.5, 3.0]
const DEFAULT_SCALE = 1.0
const MIN_SCALE = 0.5
const MAX_SCALE = 3.0

export class ViewportManager {
  private scale: number
  private scrollTop: number
  private scrollLeft: number
  private pendingUpdate: boolean = false
  private pendingZoom: number | null = null
  private pendingScroll: { top?: number; left?: number } | null = null
  private onUpdate: ViewportUpdateCallback
  private rafId: number | null = null

  constructor(onUpdate: ViewportUpdateCallback, initialScale = DEFAULT_SCALE) {
    this.scale = initialScale
    this.scrollTop = 0
    this.scrollLeft = 0
    this.onUpdate = onUpdate
  }

  /**
   * Handle a zoom change. Queues update via RAF.
   * @param newScale - Absolute scale value (not delta)
   */
  handleZoom(newScale: number): void {
    this.pendingZoom = Math.min(MAX_SCALE, Math.max(MIN_SCALE, newScale))
    this.schedulePendingUpdate()
  }

  /**
   * Handle a scroll event. Queues update via RAF.
   */
  handleScroll(scrollTop: number, scrollLeft = 0): void {
    this.pendingScroll = { top: scrollTop, left: scrollLeft }
    this.schedulePendingUpdate()
  }

  /**
   * Zoom in one step through the predefined zoom levels.
   */
  zoomIn(): void {
    const nextLevel = ZOOM_LEVELS.find((z) => z > this.scale + 0.001)
    if (nextLevel !== undefined) {
      this.handleZoom(nextLevel)
    }
  }

  /**
   * Zoom out one step through the predefined zoom levels.
   */
  zoomOut(): void {
    const prevLevel = [...ZOOM_LEVELS].reverse().find((z) => z < this.scale - 0.001)
    if (prevLevel !== undefined) {
      this.handleZoom(prevLevel)
    }
  }

  /**
   * Schedule a RAF callback for pending updates. Idempotent while frame is pending.
   */
  private schedulePendingUpdate(): void {
    if (this.pendingUpdate) return
    this.pendingUpdate = true
    this.rafId = requestAnimationFrame(() => this.applyPendingUpdates())
  }

  /**
   * Apply all queued updates in a single animation frame.
   */
  private applyPendingUpdates(): void {
    this.pendingUpdate = false
    this.rafId = null

    if (this.pendingZoom !== null) {
      this.scale = this.pendingZoom
      this.pendingZoom = null
    }

    if (this.pendingScroll !== null) {
      if (this.pendingScroll.top !== undefined) this.scrollTop = this.pendingScroll.top
      if (this.pendingScroll.left !== undefined) this.scrollLeft = this.pendingScroll.left
      this.pendingScroll = null
    }

    this.onUpdate({
      scale: this.scale,
      scrollTop: this.scrollTop,
      scrollLeft: this.scrollLeft,
    })
  }

  /**
   * Get the current viewport state without triggering an update.
   */
  getState(): ViewportState {
    return {
      scale: this.scale,
      scrollTop: this.scrollTop,
      scrollLeft: this.scrollLeft,
    }
  }

  /**
   * Get the current scale.
   */
  getScale(): number {
    return this.scale
  }

  /**
   * Get available zoom levels.
   */
  getZoomLevels(): number[] {
    return [...ZOOM_LEVELS]
  }

  /**
   * Cancel any pending RAF callbacks and clean up.
   */
  destroy(): void {
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId)
      this.rafId = null
    }
    this.pendingUpdate = false
    this.pendingZoom = null
    this.pendingScroll = null
  }
}
