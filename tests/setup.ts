import { vi } from 'vitest'

// ─── Mock PDF.js ──────────────────────────────────────────────────────────────

vi.mock('pdfjs-dist', () => ({
  GlobalWorkerOptions: { workerSrc: '' },
  getDocument: vi.fn(() => ({
    promise: Promise.resolve({
      numPages: 5,
      getPage: vi.fn((pageNum: number) =>
        Promise.resolve({
          pageNumber: pageNum,
          getViewport: vi.fn(({ scale }: { scale: number }) => ({
            width: 800 * scale,
            height: 1100 * scale,
            scale,
            viewBox: [0, 0, 800, 1100],
          })),
          render: vi.fn(() => ({
            promise: Promise.resolve(),
            cancel: vi.fn(),
          })),
          getTextContent: vi.fn(() =>
            Promise.resolve({
              items: [
                { str: 'Hello', transform: [1, 0, 0, 1, 10, 100], width: 40, height: 12 },
                { str: ' World', transform: [1, 0, 0, 1, 50, 100], width: 50, height: 12 },
              ],
            })
          ),
          cleanup: vi.fn(),
          destroy: vi.fn(),
        })
      ),
      destroy: vi.fn(),
    }),
  })),
}))

// ─── Mock Tauri IPC ───────────────────────────────────────────────────────────

vi.mock('@tauri-apps/api/core', () => ({
  invoke: vi.fn(),
  convertFileSrc: vi.fn((path: string) => `asset://${path}`),
}))

// ─── Mock crypto.randomUUID ───────────────────────────────────────────────────

if (!globalThis.crypto?.randomUUID) {
  let counter = 0
  Object.defineProperty(globalThis, 'crypto', {
    value: {
      randomUUID: () => `test-uuid-${++counter}`,
    },
  })
}

// ─── Canvas mock for jsdom ────────────────────────────────────────────────────

HTMLCanvasElement.prototype.getContext = vi.fn(() => ({
  clearRect: vi.fn(),
  fillRect: vi.fn(),
  drawImage: vi.fn(),
  getImageData: vi.fn(() => ({ data: new Uint8ClampedArray(4) })),
  putImageData: vi.fn(),
  createImageData: vi.fn(() => ({ data: new Uint8ClampedArray(4) })),
  setTransform: vi.fn(),
  scale: vi.fn(),
  translate: vi.fn(),
  save: vi.fn(),
  restore: vi.fn(),
  beginPath: vi.fn(),
  stroke: vi.fn(),
  fill: vi.fn(),
})) as unknown as typeof HTMLCanvasElement.prototype.getContext
