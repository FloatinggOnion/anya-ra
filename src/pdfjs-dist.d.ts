/**
 * Type declaration for pdfjs-dist worker imports with ?url query parameter.
 * Vite handles ?url imports as strings.
 */

declare module 'pdfjs-dist/build/pdf.worker.mjs?url' {
  const workerUrl: string
  export default workerUrl
}
