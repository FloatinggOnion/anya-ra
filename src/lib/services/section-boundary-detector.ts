import type { SectionBoundaryEvent } from '../types/suggestion'

const BOUNDARY_PATTERN = /\n\n$/
const DEBOUNCE_MS = 500

export class SectionBoundaryDetector {
  private debounceTimer: ReturnType<typeof setTimeout> | null = null

  constructor(
    private onBoundary: (event: SectionBoundaryEvent) => void,
    private getContent: () => string,
    private getDocId: () => string
  ) {}

  /**
   * Called on every keystroke/content change.
   * If content ends with two newlines, starts/restarts a 500ms debounce timer.
   * When the timer fires (user paused after section break), triggers onBoundary.
   */
  onContentChange(cursorPos: number): void {
    // 1. Clear existing timer
    if (this.debounceTimer) { clearTimeout(this.debounceTimer); this.debounceTimer = null }
    // 2. Check if content ends with two newlines
    const content = this.getContent()
    if (!BOUNDARY_PATTERN.test(content)) return  // No boundary
    // 3. Set 500ms timer to fire onBoundary
    this.debounceTimer = setTimeout(() => {
      this.debounceTimer = null
      // Extract section text: split by \n\n, filter empty segments, take last
      const parts = content.split('\n\n').filter(s => s.trim().length > 0)
      const sectionText = parts.length > 0 ? parts[parts.length - 1] : ''
      this.onBoundary({
        docId: this.getDocId(),
        content,
        sectionText,
        cursorPos,
        timestamp: Date.now()
      })
    }, DEBOUNCE_MS)
  }

  /** Manually trigger suggestions (user clicks "Suggest" button). Fires immediately. */
  triggerManual(cursorPos: number): void {
    if (this.debounceTimer) { clearTimeout(this.debounceTimer); this.debounceTimer = null }
    const content = this.getContent()
    const parts = content.split('\n\n').filter(s => s.trim().length > 0)
    const sectionText = parts.length > 0 ? parts[parts.length - 1] : ''
    this.onBoundary({
      docId: this.getDocId(),
      content,
      sectionText,
      cursorPos,
      timestamp: Date.now()
    })
  }

  /** Cancel pending detection, clean up timers */
  cleanup(): void {
    if (this.debounceTimer) { clearTimeout(this.debounceTimer); this.debounceTimer = null }
  }
}
