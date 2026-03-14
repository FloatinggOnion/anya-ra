/**
 * PDF.js worker initialization for Vite + Tauri environment.
 * Uses Vite's `?url` import pattern for correct worker path resolution.
 */
import * as pdfjsRaw from 'pdfjs-dist'
// @ts-ignore - Vite ?url import pattern
import pdfjsWorker from 'pdfjs-dist/build/pdf.worker?url'

let initialized = false

type PdfJsLike = {
  getDocument: (src: unknown) => { promise: Promise<unknown> }
  GlobalWorkerOptions: { workerSrc: string }
}

function resolvePdfJs(raw: unknown): PdfJsLike {
  const mod = raw as Record<string, unknown>
  if (mod && typeof mod.getDocument === 'function') return mod as unknown as PdfJsLike

  const fallback = mod?.default as Record<string, unknown> | undefined
  if (fallback && typeof fallback.getDocument === 'function') {
    return fallback as unknown as PdfJsLike
  }

  throw new Error('PDF.js module does not expose getDocument')
}

export const pdfjsLib = resolvePdfJs(pdfjsRaw)

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
