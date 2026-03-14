import { convertFileSrc } from '@tauri-apps/api/core'
import { readFile } from '@tauri-apps/plugin-fs'
import { pdfjsLib } from './pdf-init'

export type LoadSource = 'asset-url' | 'binary-data'

interface LoadTask<T = unknown> {
  promise: Promise<T>
}

interface LoaderDeps<TDoc = unknown> {
  convertPath: (path: string) => string
  getDocument: (src: { url: string } | { data: Uint8Array }) => LoadTask<TDoc>
  readBinary: (path: string) => Promise<Uint8Array>
  timeoutMs: number
}

const DEFAULT_TIMEOUT_MS = 12000

function defaultDeps<TDoc = unknown>(): LoaderDeps<TDoc> {
  return {
    convertPath: convertFileSrc,
    getDocument: (src) => pdfjsLib.getDocument(src) as LoadTask<TDoc>,
    readBinary: readFile,
    timeoutMs: DEFAULT_TIMEOUT_MS,
  }
}

export function normalizePdfPath(path: string): string {
  try {
    return decodeURIComponent(path)
  } catch {
    return path
  }
}

export function withTimeout<T>(promise: Promise<T>, timeoutMs: number, label: string): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error(`${label} timed out after ${timeoutMs}ms`))
    }, timeoutMs)

    promise.then(
      (value) => {
        clearTimeout(timer)
        resolve(value)
      },
      (error) => {
        clearTimeout(timer)
        reject(error)
      }
    )
  })
}

export async function loadPdfWithFallback<TDoc = unknown>(
  pdfPath: string,
  overrides?: Partial<LoaderDeps<TDoc>>
): Promise<{ doc: TDoc; source: LoadSource }> {
  const deps = { ...defaultDeps<TDoc>(), ...overrides }
  const normalizedPath = normalizePdfPath(pdfPath)
  const url = deps.convertPath(normalizedPath)

  try {
    const assetTask = deps.getDocument({ url })
    const doc = await withTimeout(assetTask.promise, deps.timeoutMs, 'PDF asset URL load')
    return { doc, source: 'asset-url' }
  } catch (assetErr) {
    console.warn('[PDFLoader] Asset URL load failed, falling back to binary data', assetErr)
    const bytes = await withTimeout(deps.readBinary(normalizedPath), deps.timeoutMs, 'PDF binary read')
    const dataTask = deps.getDocument({ data: bytes })
    const doc = await withTimeout(dataTask.promise, deps.timeoutMs, 'PDF binary parse')
    return { doc, source: 'binary-data' }
  }
}
