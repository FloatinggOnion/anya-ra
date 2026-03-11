/**
 * PDF.js worker initialization for Vite + Tauri environment.
 * Uses Vite's `?url` import pattern for correct worker path resolution.
 */
import * as pdfjsLib from 'pdfjs-dist'
// @ts-ignore - Vite ?url import pattern
import pdfjsWorker from 'pdfjs-dist/build/pdf.worker?url'

let initialized = false

/**
 * Initialize the PDF.js worker. Must be called before any PDF operations.
 * Idempotent — safe to call multiple times.
 */
export function initPDFWorker(): void {
  if (initialized) return
  pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorker
  initialized = true
}

/**
 * Reset initialization state (for testing).
 */
export function resetPDFWorker(): void {
  initialized = false
}

export { pdfjsLib }
