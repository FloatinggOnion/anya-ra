/**
 * PDF.js initialization module
 * Configures PDF.js worker and exports the library for use throughout the app
 */

import * as pdfjs from 'pdfjs-dist'

/**
 * Initialize PDF.js worker
 * Must be called before using PDF.js functionality
 * In browser context, sets up the worker from the bundled worker script
 */
export function initPDFWorker(): void {
  // In browser/test environments, set the worker source
  // The worker path is injected at build time via Vite
  if (typeof window !== 'undefined' && 'GlobalWorkerOptions' in pdfjs) {
    try {
      // Try to get the worker from pdfjs-dist
      // In production, this would be the bundled worker URL
      const workerScript = `
        importScripts('${new URL('pdfjs-dist/build/pdf.worker.mjs', import.meta.url).href}');
      `
      const blob = new Blob([workerScript], { type: 'application/javascript' })
      const workerUrl = URL.createObjectURL(blob)
      pdfjs.GlobalWorkerOptions.workerSrc = workerUrl
    } catch (error) {
      // Fallback: worker will be set via pdfWorker import in SVG components
      console.warn('Failed to initialize PDF.js worker automatically', error)
    }
  }
}

/**
 * Export PDF.js library for direct use
 * Users can call pdfjs.getDocument(), etc.
 */
export { pdfjs as pdfjsLib }

// Auto-initialize on module load in browser environments
if (typeof window !== 'undefined') {
  initPDFWorker()
}
