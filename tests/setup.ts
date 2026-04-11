import { vi } from 'vitest'
import type { Editor } from '@codemirror/view'
import type { EditorState } from '@codemirror/state'

// ─── Mock PDF.js ──────────────────────────────────────────────────────────────

const pdfMock = {
  default: {
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
  },
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
}

vi.mock('pdfjs-dist', () => pdfMock)

vi.mock('pdfjs-dist/build/pdf.js', () => pdfMock)

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

// ═════════════════════════════════════════════════════════════════════════════
// WAVE 0: Test Infrastructure for Conservative Inline Suggestions
// ═════════════════════════════════════════════════════════════════════════════

// ===== CodeMirror Mocks =====

export function createMockEditor(): Editor {
  return {
    state: createMockEditorState(),
    dispatch: vi.fn(),
    focus: vi.fn(),
    destroy: vi.fn(),
    dom: document.createElement('div'),
    contentDOM: document.createElement('div'),
    view: null,
  } as unknown as Editor
}

export function createMockEditorState(): EditorState {
  return {
    doc: { toString: () => '', length: 0 },
    selection: { main: { from: 0, to: 0, anchor: 0, head: 0 } },
    field: vi.fn(),
  } as unknown as EditorState
}

// ===== Tauri Invoke Mocks =====

export function mockTauriInvoke(
  command: string,
  response: unknown = {},
  shouldError = false
) {
  const mockImpl = shouldError
    ? vi.fn().mockRejectedValue(new Error(`Mock error: ${command}`))
    : vi.fn().mockResolvedValue(response)

  vi.doMock('@tauri-apps/api', () => ({
    invoke: mockImpl,
  }))
  return mockImpl
}

// ===== LLMProvider Mocks =====

export async function* createMockProviderStream(
  text: string,
  delayMs: number = 0
): AsyncIterable<string> {
  // Simulate streaming response with optional delay
  const words = text.split(' ')
  for (const word of words) {
    if (delayMs > 0) await new Promise(r => setTimeout(r, delayMs))
    yield word + ' '
  }
}

export function createMockOllamaProvider() {
  return {
    chat: vi.fn(async function* (messages, options) {
      yield* createMockProviderStream('This is a mock suggestion')
    }),
    isAvailable: vi.fn().mockResolvedValue(true),
    name: 'ollama',
  }
}

export function createMockOpenRouterProvider() {
  return {
    chat: vi.fn(async function* (messages, options) {
      yield* createMockProviderStream('This is another mock suggestion')
    }),
    isAvailable: vi.fn().mockResolvedValue(true),
    name: 'openrouter',
  }
}

// ===== Context Selection Store Mock =====

export function createMockContextSelectionStore() {
  return {
    selectedItems: new Map([
      ['paper-1', { id: 'paper-1', title: 'Sample Paper', content: 'Abstract...', type: 'paper' }],
    ]),
    toggleSelection: vi.fn(),
    setSelected: vi.fn(),
  }
}

// ===== Latency Measurement Utility =====

export interface LatencyMeasurement {
  requestId: string
  startTime: number
  finishTime: number
  duration: number // milliseconds
}

const latencyMeasurements = new Map<string, LatencyMeasurement>()

export function startLatencyMeasure(requestId: string): number {
  return performance.now()
}

export function finishLatencyMeasure(requestId: string, startTime: number): LatencyMeasurement {
  const finishTime = performance.now()
  const measurement: LatencyMeasurement = {
    requestId,
    startTime,
    finishTime,
    duration: finishTime - startTime,
  }
  latencyMeasurements.set(requestId, measurement)
  return measurement
}

export function getLatencyStats(): {
  p50: number
  p95: number
  p99: number
  mean: number
} {
  const durations = Array.from(latencyMeasurements.values())
    .map(m => m.duration)
    .sort((a, b) => a - b)

  if (durations.length === 0) return { p50: 0, p95: 0, p99: 0, mean: 0 }

  return {
    p50: durations[Math.floor(durations.length * 0.5)],
    p95: durations[Math.floor(durations.length * 0.95)],
    p99: durations[Math.floor(durations.length * 0.99)],
    mean: durations.reduce((a, b) => a + b, 0) / durations.length,
  }
}

export function clearLatencyMeasurements() {
  latencyMeasurements.clear()
}
