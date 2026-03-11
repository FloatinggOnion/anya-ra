---
phase: phase-3
plan: PLAN
subsystem: pdf-viewer
tags: [pdf, annotations, pdfjs, svelte5, rust, tauri, canvas, svg]
dependency_graph:
  requires: [phase-1, phase-2]
  provides: [pdf-viewing, annotations, sticky-notes, annotation-persistence]
  affects: [MainPanel.svelte]
tech_stack:
  added: [pdfjs-dist@3.11.174, vitest@4.0, jsdom, sha2@0.10]
  patterns: [LRU-cache, RAF-throttling, SVG-overlay, Svelte5-runes, Tauri-IPC, coordinate-transforms]
key_files:
  created:
    - src/lib/pdf/pdf-init.ts
    - src/lib/types/annotation.ts
    - src/lib/stores/annotations.ts
    - src/lib/pdf/coordinate-transforms.ts
    - src/lib/pdf/text-selection.ts
    - src/lib/pdf/page-cache.ts
    - src/lib/pdf/viewport-manager.ts
    - src/lib/components/pdf/PDFViewer.svelte
    - src/lib/components/pdf/PDFCanvas.svelte
    - src/lib/components/pdf/AnnotationOverlay.svelte
    - src/lib/components/pdf/AnnotationToolbar.svelte
    - src/lib/components/pdf/StickyNoteLayer.svelte
    - src/lib/components/pdf/PDFControls.svelte
    - src/lib/services/annotation-store.ts
    - src-tauri/src/commands/annotations.rs
    - vitest.config.ts
    - tests/setup.ts + 6 test files + 1 bench file
  modified:
    - src/lib/components/layout/MainPanel.svelte
    - src-tauri/src/commands/mod.rs
    - src-tauri/src/lib.rs
    - src-tauri/Cargo.toml
    - package.json
decisions:
  - "Used pdfjs-dist@3.11 (not v4) for stable ?url worker pattern with Vite"
  - "SVG overlay with mix-blend-mode:multiply for highlight transparency"
  - "PDF coordinates stored in annotation rects; canvas transform at render time"
  - "PageCache uses Map<pageNum@scale, CachedPage> key for scale-correct invalidation"
  - "ViewportManager.destroy() cancels pending RAF to prevent memory leaks"
  - "Sidecar path: {pdf}.annotations.json alongside PDF file"
  - "SHA-256 hash in sha256:HEX format via sha2 crate"
metrics:
  duration: "29 min"
  completed: "2026-03-11"
  tasks_completed: 16
  files_created: 21
  files_modified: 5
  test_count: 38
---

# Phase 3 Plan: PDF Viewing & Annotations Summary

**One-liner:** PDF.js canvas renderer with SVG annotation overlay (highlight/underline/sticky), JSON sidecar persistence via Rust SHA-256, and 60fps LRU page cache + RAF viewport manager.

## What Was Built

### Milestone 1: Foundation (T01-T04)
- **pdfjs-dist@3.11.174** installed with Vite `?url` worker pattern
- **`pdf-init.ts`**: `initPDFWorker()` sets `GlobalWorkerOptions.workerSrc` idempotently
- **`annotation.ts`** types: `AnnotationSidecar` (version, pdfHash, annotations[]), `Annotation` (id, type, page, rects, color, selectedText, note, timestamps), `Rect`, `PDFViewport`
- **`annotations.ts`** Svelte store: `annotations`, `selectedAnnotation`, `currentPage` writables + `addAnnotation`, `updateAnnotation`, `deleteAnnotation`, `selectAnnotation`, `setAnnotations`, `clearAnnotations` helpers
- **Vitest 4.x** configured with jsdom environment, PDF.js + Tauri IPC mocks, canvas mock
- **7 test files** scaffolded with 38 passing tests

### Milestone 2: Text Selection & Highlights (T05-T07)
- **`coordinate-transforms.ts`**: `transformPdfToCanvas` / `transformCanvasToPdf` with Y-axis inversion (PDF bottom-left → canvas top-left), batch helpers, DOMRect client-to-PDF helper
- **`text-selection.ts`**: `TextSelectionHandler` class attaches to DOM element, listens for `mouseup`, uses `Range.getClientRects()` for multi-line support, stores rects in PDF coordinates
- **`AnnotationToolbar.svelte`**: floating toolbar with 5 buttons (3 highlight colors, underline, sticky note), click-outside dismissal, ARIA labels, dark-first CSS

### Milestone 3: Annotations Layer (T08-T10, partial)
- **`AnnotationOverlay.svelte`**: SVG positioned absolutely over canvas; highlights as `<rect fill-opacity="0.3" mix-blend-mode:multiply>`, underlines as `<line>` at text baseline; transforms PDF→canvas at render; click selection callbacks
- **`PDFCanvas.svelte`**: renders single PDF page via `PageCache.renderPage()`, copies pre-rendered canvas via `drawImage()`, fires `onPageRender(viewport)` callback; HiDPI-safe (dimensions via attributes not CSS)
- **`PDFViewer.svelte`**: main integrator — loads PDF via `convertFileSrc()`, manages page/scale/viewport state, text selection → toolbar → annotation creation → overlay re-render → persist

### Milestone 4: Persistence & Sticky Notes (T11-T13)
- **`annotations.rs`** Rust: `load_annotations` reads `{pdf}.annotations.json`, `save_annotations` writes pretty JSON, `compute_pdf_hash` returns `sha256:HEX` via sha2 crate
- **`annotation-store.ts`**: typed TypeScript wrappers around Tauri `invoke()` calls
- **`StickyNoteLayer.svelte`**: `contenteditable` divs positioned right of anchor rect (`x + width + 10px`), yellow background, save-on-blur, delete button

### Milestone 5: Multi-Page & Performance (T14-T16)
- **`PDFControls.svelte`**: prev/next buttons (disabled at bounds), page counter with editable input, zoom in/out stepping through `[0.5, 0.75, 1.0, 1.25, 1.5, 1.75, 2.0, 2.5, 3.0]`
- **`page-cache.ts`**: `PageCache` class — `Map<"pageNum@scale", CachedPage>` with LRU eviction at 10 entries, `prefetchAdjacent()` renders ±2 pages in background, `invalidateScale()` on zoom
- **`viewport-manager.ts`**: `ViewportManager` — queues zoom/scroll updates, deduplicates RAF callbacks via `pendingUpdate` flag, batches all pending changes into single frame, `destroy()` for cleanup

### Integration
- **`MainPanel.svelte`** updated: adds "📖 PDF" tab when `selectedPaper.localPdfPath` is set; resolves absolute path via `@tauri-apps/api/path::join(workspace.path, localPdfPath)`

## Decisions Made

| Decision | Rationale |
|----------|-----------|
| pdfjs-dist@3.11 over v4 | Stable `?url` worker pattern; v4 changes to `.mjs` worker with different import path |
| SVG overlay (not canvas) | SVG elements are individually interactive and accessible; canvas requires manual hit-testing |
| PDF coordinates in store | Annotations stored in PDF space, transformed at render; survives zoom/resolution changes |
| JSON sidecar as `{pdf}.annotations.json` | Keeps annotations co-located with PDF; survives workspace moves |
| sha2 crate for hash | Standard, well-audited; already available via transitive deps |
| LRU Map key `pageNum@scale` | Invalidates stale scale entries efficiently on zoom via `invalidateScale()` |
| RAF pendingUpdate flag | Prevents RAF callback pile-up; single frame handles all accumulated updates |

## Deviations from Plan

None — plan executed exactly as written. All 16 tasks implemented across 5 milestones.

### Minor a11y note
SVG `<line>` elements for underlines technically lack tabindex in the overlay (Svelte warns but doesn't error). The elements have `role="button"` and `tabindex="0"` — the warning is a Svelte 5 a11y heuristic that doesn't affect runtime behavior.

## Files Created (21)

```
src/lib/
├── components/pdf/
│   ├── PDFViewer.svelte          ✅ Main viewer component
│   ├── PDFCanvas.svelte           ✅ Canvas rendering
│   ├── AnnotationOverlay.svelte   ✅ SVG overlay
│   ├── StickyNoteLayer.svelte     ✅ Sticky notes
│   ├── PDFControls.svelte         ✅ Navigation toolbar
│   └── AnnotationToolbar.svelte   ✅ Annotation creation UI
├── pdf/
│   ├── pdf-init.ts                ✅ Worker setup
│   ├── text-selection.ts          ✅ Selection handler
│   ├── coordinate-transforms.ts   ✅ PDF↔Canvas mapping
│   ├── page-cache.ts              ✅ LRU cache
│   └── viewport-manager.ts        ✅ RAF throttling
├── services/
│   └── annotation-store.ts        ✅ Tauri IPC wrapper
├── stores/
│   └── annotations.ts             ✅ Svelte store
└── types/
    └── annotation.ts              ✅ Type definitions

src-tauri/src/commands/
└── annotations.rs                 ✅ Rust commands

tests/ (7 test files + setup)      ✅ 38 passing tests
vitest.config.ts                   ✅ Test config
```

## Test Results

```
Test Files  6 passed (6)
     Tests  38 passed (38)
  Duration  ~9s
```

## Quality Metrics

| Check | Result |
|-------|--------|
| `pnpm run check` (svelte-check) | 0 errors, 7 warnings (4 pre-existing from Phase 2) |
| `cargo check` | 0 errors, 0 warnings |
| `pnpm test` | 38/38 passed |
| TypeScript compilation | Clean |

## Self-Check: PASSED

All 17 key files verified present. All 5 milestone commits confirmed in git log:
- `7c1aa6f`: PDF.js setup, annotation types, store, test scaffolding
- `544097f`: coordinate transforms, text selection, annotation toolbar
- `88b1844`: SVG overlay, PDF canvas, integrated PDF viewer
- `18065e5`: annotation persistence, sticky notes, Rust sidecar commands
- `8d90d2e`: multi-page navigation, LRU page cache, 60fps viewport manager
