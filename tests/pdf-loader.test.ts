import { describe, it, expect, vi } from 'vitest'
import { loadPdfWithFallback, normalizePdfPath } from '../src/lib/pdf/document-loader'

describe('PDF loader fallback', () => {
  it('loads via asset URL when primary path succeeds', async () => {
    const getDocument = vi.fn().mockImplementation((src: { url?: string; data?: Uint8Array }) => {
      if (src.url) return { promise: Promise.resolve({ numPages: 3 }) }
      return { promise: Promise.reject(new Error('unexpected data path')) }
    })

    const result = await loadPdfWithFallback('test/path.pdf', {
      convertPath: (p) => `asset://localhost/${p}`,
      getDocument,
      readBinary: async () => new Uint8Array([1, 2, 3]),
      timeoutMs: 50,
    })

    expect(result.source).toBe('asset-url')
    expect(result.doc).toEqual({ numPages: 3 })
    expect(getDocument).toHaveBeenCalledTimes(1)
  })

  it('falls back to binary data when asset URL load fails', async () => {
    const getDocument = vi.fn().mockImplementation((src: { url?: string; data?: Uint8Array }) => {
      if (src.url) return { promise: Promise.reject(new Error('asset failed')) }
      return { promise: Promise.resolve({ numPages: 7 }) }
    })

    const result = await loadPdfWithFallback('/tmp/sample.pdf', {
      convertPath: (p) => `asset://localhost/${p}`,
      getDocument,
      readBinary: async () => new Uint8Array([9, 9, 9]),
      timeoutMs: 50,
    })

    expect(result.source).toBe('binary-data')
    expect(result.doc).toEqual({ numPages: 7 })
    expect(getDocument).toHaveBeenCalledTimes(2)
  })

  it('falls back when primary load times out', async () => {
    const getDocument = vi.fn().mockImplementation((src: { url?: string; data?: Uint8Array }) => {
      if (src.url) return { promise: new Promise(() => undefined) }
      return { promise: Promise.resolve({ numPages: 2 }) }
    })

    const result = await loadPdfWithFallback('/tmp/slow.pdf', {
      convertPath: (p) => `asset://localhost/${p}`,
      getDocument,
      readBinary: async () => new Uint8Array([4, 5, 6]),
      timeoutMs: 10,
    })

    expect(result.source).toBe('binary-data')
    expect(result.doc).toEqual({ numPages: 2 })
  })
})

describe('normalizePdfPath', () => {
  it('decodes URI-encoded paths when valid', () => {
    expect(normalizePdfPath('/Users/paul/My%20Paper.pdf')).toBe('/Users/paul/My Paper.pdf')
  })

  it('returns original path when decode fails', () => {
    expect(normalizePdfPath('/Users/paul/100%_draft.pdf')).toBe('/Users/paul/100%_draft.pdf')
  })
})
