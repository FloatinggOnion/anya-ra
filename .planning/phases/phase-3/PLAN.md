# Phase 3: PDF Viewing & Annotations - Detailed Plan

**Phase Goal:** Built-in PDF viewer with highlight, sticky note, and underline annotations. Annotations persist in JSON sidecar files. 60fps rendering.

**Success Criteria:**
1. User opens PDF from paper list and sees rendered pages
2. User selects text → creates highlight (yellow, green, red)
3. User creates sticky note on page, content persists
4. User creates underline annotation on text
5. Annotations save to JSON sidecar, reload on reopen
6. 60fps during scroll/zoom

**Phase Requirements:** PDF-01, PDF-02, PDF-03, PDF-04, PDF-05, PDF-06

**Tech Stack:**
- `pdfjs-dist` v3.11+ for Canvas-based rendering
- SVG overlay for annotations (positioned over canvas)
- JSON sidecar files: `{pdfPath}.annotations.json` in paper folder
- Coordinate transform: PDF bottom-left → screen top-left
- Lazy rendering: current page ± 2 adjacent, LRU cache (max 10 pages)
- `requestAnimationFrame` throttling for zoom/scroll
- Tauri `file://` protocol for serving local PDFs (already in fs scope)

**Dependency Note:** Phase 3 depends on Phase 2 Paper Management. Assumes `Paper` interface includes:
- `id: string` — unique paper identifier  
- `localPdfPath: string | null` — absolute path to PDF on disk

---

## Milestones

### Milestone 1: Foundation (Tasks 1-4)
**Goal:** PDF.js setup, basic rendering infrastructure, test scaffolding  
**Deliverable:** Single-page PDF renders in canvas, worker configured, Vitest ready

### Milestone 2: Text Selection & Highlights (Tasks 5-7)
**Goal:** User can select text and create colored highlights  
**Deliverable:** Working highlight creation with yellow/green/red colors

### Milestone 3: Annotations Layer (Tasks 8-10)
**Goal:** SVG overlay renders highlights, underlines; coordinate transforms work  
**Deliverable:** Annotations display correctly on top of PDF canvas

### Milestone 4: Persistence & Sticky Notes (Tasks 11-13)
**Goal:** Annotations save to sidecar, sticky notes functional  
**Deliverable:** Annotations persist across app restarts

### Milestone 5: Multi-Page & Performance (Tasks 14-16)
**Goal:** Page navigation, lazy rendering, 60fps scroll/zoom  
**Deliverable:** Smooth performance on 50+ page PDFs

---

## Tasks

### Task 1: Install Dependencies & Configure PDF.js Worker

**ID:** P3-T01  
**Type:** Setup  
**Dependencies:** None  
**Estimated Effort:** 30-45 minutes

**Description:**

Install `pdfjs-dist` package and configure the worker path for Vite + Tauri environment using the `?url` import pattern.

**Steps:**
1. Install dependencies:
   ```bash
   npm install pdfjs-dist@^3.11.174
   npm install -D vitest jsdom @vitest/ui
   ```

2. Create PDF.js initialization module:
   - File: `src/lib/pdf/pdf-init.ts`
   - Import worker using Vite's `?url` plugin
   - Export `initPDFWorker()` function
   - Set `pdfjsLib.GlobalWorkerOptions.workerSrc`

3. Configure Vitest:
   - File: `vitest.config.ts`
   - Set environment to `jsdom`
   - Configure test setup file
   - Add coverage config

4. Create test setup:
   - File: `tests/setup.ts`
   - Mock PDF.js for unit tests
   - Mock Tauri IPC commands (`invoke`)

**Files Created:**
- `src/lib/pdf/pdf-init.ts`
- `vitest.config.ts`
- `tests/setup.ts`

**Files Modified:**
- `package.json` (dependencies)

**Acceptance Criteria:**
- [ ] `pdfjs-dist` v3.11+ in `package.json`
- [ ] `vitest` installed and configured
- [ ] `src/lib/pdf/pdf-init.ts` exports `initPDFWorker()`
- [ ] Worker path uses `?url` import (Vite pattern)
- [ ] `vitest.config.ts` exists with jsdom environment
- [ ] `tests/setup.ts` mocks PDF.js and Tauri commands
- [ ] `npm run test` executes without errors (no tests yet, but config works)

---

### Task 2: Create Annotation Type Definitions

**ID:** P3-T02  
**Type:** Types  
**Dependencies:** P3-T01  
**Estimated Effort:** 20-30 minutes

**Description:**

Define TypeScript interfaces for the annotation data model, following the JSON schema from research. Store in types directory following Phase 1 pattern.

**Schema:**
```typescript
interface AnnotationSidecar {
  version: "1.0";
  pdfFile: string;
  pdfHash: string;
  annotations: Annotation[];
}

interface Annotation {
  id: string;
  type: "highlight" | "note" | "underline";
  pageNum: number;
  color?: string;
  rects: Rect[];
  extractedText?: string;
  created: string;  // ISO 8601
  modified: string;
  noteContent?: string;
  linkedAnnotationIds?: string[];
  tags?: string[];
}

interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}
```

**Files Created:**
- `src/lib/types/annotation.ts`

**Acceptance Criteria:**
- [ ] `src/lib/types/annotation.ts` exists
- [ ] Exports `AnnotationSidecar`, `Annotation`, `Rect` interfaces
- [ ] `Annotation.type` union type includes all three types
- [ ] All fields match research schema
- [ ] ISO 8601 string types for timestamps
- [ ] TypeScript compilation succeeds with no errors

---

### Task 3: Create Annotation Svelte Store

**ID:** P3-T03  
**Type:** State Management  
**Dependencies:** P3-T02  
**Estimated Effort:** 30-45 minutes

**Description:**

Create a Svelte store for managing annotation state in the UI, following the workspace store pattern from Phase 1. Store current PDF's annotations in memory, with methods to add/update/delete.

**Pattern:** Follow `src/lib/stores/workspace.ts` structure.

**Store interface:**
```typescript
interface AnnotationState {
  annotations: Annotation[];
  selectedAnnotation: Annotation | null;
  currentPage: number;
}
```

**Exported functions:**
- `addAnnotation(annotation: Annotation)`
- `updateAnnotation(id: string, partial: Partial<Annotation>)`
- `deleteAnnotation(id: string)`
- `selectAnnotation(id: string | null)`
- `clearAnnotations()`

**Files Created:**
- `src/lib/stores/annotations.ts`

**Acceptance Criteria:**
- [ ] `src/lib/stores/annotations.ts` exists
- [ ] Uses Svelte 5 `writable` pattern (consistent with Phase 1)
- [ ] Exports `annotations`, `selectedAnnotation`, `currentPage` stores
- [ ] Exports CRUD functions for annotations
- [ ] TypeScript types imported from `types/annotation.ts`
- [ ] Store methods immutably update array (use spread operator)

---

### Task 4: Scaffold Test Files (Wave 0)

**ID:** P3-T04  
**Type:** Testing  
**Dependencies:** P3-T01, P3-T02, P3-T03  
**Estimated Effort:** 45-60 minutes

**Description:**

Create test file scaffolds for all Phase 3 features following Vitest patterns. Each test file should have at least one passing placeholder test to validate the test infrastructure.

**Test files to create:**
1. `tests/pdf-rendering.test.ts` — PDF loading, canvas render validation
2. `tests/text-selection.test.ts` — Selection API mocking, rect extraction
3. `tests/annotations.test.ts` — CRUD operations on annotation store
4. `tests/coordinate-transform.test.ts` — PDF ↔ Canvas coordinate mapping
5. `tests/sticky-notes.test.ts` — Note creation, editing
6. `tests/persistence.test.ts` — Sidecar I/O, JSON round-trip
7. `tests/perf.bench.ts` — Page render time benchmarks

Each test file should:
- Import necessary mocks from `tests/setup.ts`
- Have at least one `describe` block
- Have one passing `it('should be configured correctly')` test
- Use `beforeEach`/`afterEach` for cleanup

**Files Created:**
- `tests/pdf-rendering.test.ts`
- `tests/text-selection.test.ts`
- `tests/annotations.test.ts`
- `tests/coordinate-transform.test.ts`
- `tests/sticky-notes.test.ts`
- `tests/persistence.test.ts`
- `tests/perf.bench.ts`

**Acceptance Criteria:**
- [ ] All 7 test files exist in `tests/` directory
- [ ] Each file has at least one passing test
- [ ] `npm run test` executes all tests successfully
- [ ] No TypeScript errors in test files
- [ ] Test output shows 7+ passing tests (one per file minimum)
- [ ] Test execution time < 5 seconds

---

### Task 5: Create Coordinate Transform Utilities

**ID:** P3-T05  
**Type:** Core Logic  
**Dependencies:** P3-T02, P3-T04  
**Estimated Effort:** 1-2 hours

**Description:**

Implement coordinate transformation functions to convert between PDF coordinate system (origin: bottom-left, Y increases upward) and Canvas coordinate system (origin: top-left, Y increases downward). This is critical for annotation positioning.

**Key transformation:**
```typescript
canvasY = viewportHeight - (pdfY + pdfRectHeight)
```

**Functions to implement:**
- `transformPdfToCanvas(pdfRect: Rect, viewport: PDFViewport): Rect`
- `transformCanvasToPdf(canvasRect: Rect, viewport: PDFViewport): Rect`

Both functions must:
- Apply scale from viewport
- Handle coordinate system inversion
- Preserve floating-point precision (no integer rounding)

**TDD approach:**
1. Write tests in `tests/coordinate-transform.test.ts` first
2. Test cases:
   - PDF rect at bottom → high canvas Y
   - PDF rect at top → low canvas Y
   - Scale 1.0 vs 1.5 vs 2.0
   - Round-trip: PDF → Canvas → PDF should match
3. Implement functions to pass tests

**Files Created:**
- `src/lib/pdf/coordinate-transforms.ts`

**Files Modified:**
- `tests/coordinate-transform.test.ts` (add real tests)

**Acceptance Criteria:**
- [ ] `src/lib/pdf/coordinate-transforms.ts` exports both transform functions
- [ ] Functions accept `Rect` and `PDFViewport` parameters
- [ ] Coordinate inversion formula correctly applied
- [ ] Scale factor applied to all dimensions
- [ ] Tests pass: `npm run test -- coordinate-transform.test.ts`
- [ ] Round-trip test (PDF→Canvas→PDF) passes with <0.01 precision
- [ ] No integer rounding (preserve floats)

---

### Task 6: Implement Text Selection Handler

**ID:** P3-T06  
**Type:** Core Logic  
**Dependencies:** P3-T05  
**Estimated Effort:** 1.5-2 hours

**Description:**

Create a class that intercepts browser text selection on the PDF text layer and extracts bounding rectangles in PDF coordinates. Uses the native `Selection API` and `Range.getClientRects()`.

**Class structure:**
```typescript
class TextSelectionHandler {
  private textLayer: HTMLElement | null;
  private selectedRects: Rect[];
  private selectedText: string;
  
  attachToTextLayer(containerId: string)
  onTextSelection() // private
  getSelection(): { text: string, rects: Rect[] }
  clearSelection()
}
```

**Implementation:**
1. Listen to `mouseup` event on text layer
2. Call `window.getSelection()` to get selected range
3. Use `Range.getClientRects()` to get bounding boxes
4. Transform each rect from canvas to PDF coordinates
5. Store selected text and rects

**Edge cases to handle:**
- No selection (empty range) → return empty arrays
- Multi-line selection → return array of rects (one per line)
- Selection outside text layer → ignore

**Files Created:**
- `src/lib/pdf/text-selection.ts`

**Files Modified:**
- `tests/text-selection.test.ts` (add real tests)

**Acceptance Criteria:**
- [ ] `src/lib/pdf/text-selection.ts` exports `TextSelectionHandler` class
- [ ] Class attaches to DOM element by ID
- [ ] `getSelection()` returns text and rects
- [ ] Rects are in PDF coordinates (not canvas)
- [ ] Multi-line selections return multiple rects
- [ ] Empty selection returns empty arrays
- [ ] Tests pass: `npm run test -- text-selection.test.ts`

---

### Task 7: Create Annotation Toolbar Component

**ID:** P3-T07  
**Type:** UI Component  
**Dependencies:** P3-T03, P3-T06  
**Estimated Effort:** 1-1.5 hours

**Description:**

Create a toolbar UI component that appears when text is selected, allowing the user to create highlights or underlines with color selection. Follows Svelte 5 component patterns.

**UI requirements:**
- Appears near selected text (absolute positioning)
- Buttons: Highlight (Yellow), Highlight (Green), Highlight (Red), Underline, Note
- Dismisses when user clicks elsewhere or creates annotation
- Accessible (keyboard nav, ARIA labels)

**Component props:**
```typescript
interface Props {
  selectedText: string;
  selectedRects: Rect[];
  pageNum: number;
  onCreateHighlight: (color: string) => void;
  onCreateUnderline: (color: string) => void;
  onCreateNote: () => void;
  onDismiss: () => void;
}
```

**Files Created:**
- `src/lib/components/pdf/AnnotationToolbar.svelte`

**Acceptance Criteria:**
- [ ] Component file exists in `src/lib/components/pdf/`
- [ ] Renders five buttons with appropriate labels
- [ ] Clicking highlight button calls `onCreateHighlight` with color
- [ ] Clicking underline button calls `onCreateUnderline`
- [ ] Clicking note button calls `onCreateNote`
- [ ] Clicking outside toolbar calls `onDismiss`
- [ ] ARIA labels present for accessibility
- [ ] CSS uses dark-first custom properties (consistent with Phase 1)
- [ ] Component compiles without TypeScript errors

---

### Task 8: Create SVG Annotation Overlay Component

**ID:** P3-T08  
**Type:** UI Component  
**Dependencies:** P3-T05  
**Estimated Effort:** 2-3 hours

**Description:**

Create a Svelte component that renders an SVG layer positioned absolutely over the PDF canvas. The SVG contains visual representations of highlights and underlines using transformed coordinates.

**Component structure:**
- Positioned absolutely over canvas (same dimensions)
- `mix-blend-mode: multiply` for highlight transparency
- Re-renders when page changes or zoom updates
- Filters annotations to current page only

**Rendering logic:**
- Highlight: SVG `<rect>` with fill color at 0.3 opacity
- Underline: SVG `<line>` at bottom edge of rect
- Click handlers for selecting annotations

**Props:**
```typescript
interface Props {
  annotations: Annotation[];
  currentPage: number;
  viewport: PDFViewport;
  onAnnotationSelect?: (annotation: Annotation) => void;
}
```

**Functions:**
- `renderAnnotationsForPage()` — main render function
- `renderHighlight(rect: Rect, annotation: Annotation)` — create SVG rect
- `renderUnderline(rect: Rect, annotation: Annotation)` — create SVG line

**Files Created:**
- `src/lib/components/pdf/AnnotationOverlay.svelte`

**Acceptance Criteria:**
- [ ] Component exists in `src/lib/components/pdf/`
- [ ] SVG layer positioned absolutely with correct dimensions
- [ ] Highlights render as semi-transparent rectangles
- [ ] Underlines render as lines at text baseline
- [ ] Coordinate transform applied to all rects
- [ ] Filters to current page only
- [ ] Click on annotation calls `onAnnotationSelect`
- [ ] Multiple rects per annotation supported (multi-line)
- [ ] Compiles without TypeScript errors
- [ ] Visual test: highlight aligns with text (manual verification)

---

### Task 9: Create PDF Canvas Component

**ID:** P3-T09  
**Type:** UI Component  
**Dependencies:** P3-T01  
**Estimated Effort:** 1.5-2 hours

**Description:**

Create a Svelte component that renders a single PDF page to an HTML5 canvas element using PDF.js. Component receives page number and renders on mount and when props change.

**Component props:**
```typescript
interface Props {
  pdf: PDFDocumentProxy | null;
  pageNum: number;
  scale: number;
  onPageRender?: (viewport: PDFViewport) => void;
}
```

**Rendering steps:**
1. Get page from PDF document: `pdf.getPage(pageNum)`
2. Get viewport: `page.getViewport({ scale })`
3. Set canvas dimensions: `canvas.width = viewport.width`
4. Render to canvas: `page.render({ canvasContext, viewport })`
5. Extract text content: `page.getTextContent()`
6. Call `onPageRender` with viewport

**Critical:** Set canvas `width`/`height` attributes (not CSS) to avoid blurry rendering on high-DPI screens.

**Files Created:**
- `src/lib/components/pdf/PDFCanvas.svelte`

**Files Modified:**
- `tests/pdf-rendering.test.ts` (add rendering tests)

**Acceptance Criteria:**
- [ ] Component exists in `src/lib/components/pdf/`
- [ ] Accepts `pdf`, `pageNum`, `scale` props
- [ ] Canvas renders page correctly
- [ ] Canvas dimensions set via attributes (not CSS)
- [ ] Text layer extracted via `getTextContent()`
- [ ] `onPageRender` callback fires with viewport
- [ ] Re-renders when `pageNum` or `scale` changes
- [ ] Tests pass: `npm run test -- pdf-rendering.test.ts`
- [ ] No blurry rendering (verified manually on 2x DPI screen)

---

### Task 10: Integrate PDF Viewer with Overlay

**ID:** P3-T10  
**Type:** Integration  
**Dependencies:** P3-T03, P3-T05, P3-T07, P3-T08, P3-T09, P3-T13, P3-T15, P3-T16  
**Estimated Effort:** 2-3 hours

**Description:**

Create the main `PDFViewer` component that integrates canvas rendering, annotation overlay, text selection, and annotation toolbar. This is the top-level component that manages the PDF viewing state.

**Component structure:**
```svelte
<PDFViewer {pdfPath} {paperId}>
  <PDFCanvas />
  <AnnotationOverlay />
  <StickyNoteLayer />
  <AnnotationToolbar /> <!-- conditional -->
</PDFViewer>
```

**State management:**
- Load PDF on mount using `pdfjs.getDocument()`
- Call `initPDFWorker()` before loading
- Track current page, total pages, scale
- Track selected text and rects
- Show/hide annotation toolbar based on selection

**Event flow:**
1. User selects text → `TextSelectionHandler` captures
2. Toolbar appears with create buttons
3. User clicks color → creates annotation in store
4. Overlay re-renders with new annotation
5. Toolbar dismisses

**Files Created:**
- `src/lib/components/pdf/PDFViewer.svelte`

**Acceptance Criteria:**
- [ ] Component exists in `src/lib/components/pdf/`
- [ ] Loads PDF using `file://` protocol
- [ ] Calls `initPDFWorker()` on mount
- [ ] Renders `PDFCanvas`, `AnnotationOverlay` components
- [ ] Shows `AnnotationToolbar` when text selected
- [ ] Creates highlight when toolbar button clicked
- [ ] Annotation appears in overlay after creation
- [ ] Component handles PDF load errors gracefully
- [ ] TypeScript compiles without errors
- [ ] StickyNoteLayer renders sticky notes at correct positions
- [ ] ViewportManager integrated: zoom/scroll handlers use RAF throttling (<16ms frame time)
- [ ] PageCache integrated: pre-rendered pages load from cache, not re-rendered

---

### Task 11: Implement Tauri Annotation Commands (Rust)

**ID:** P3-T11  
**Type:** Backend  
**Dependencies:** P3-T02  
**Estimated Effort:** 2-2.5 hours

**Description:**

Create Tauri commands in Rust for loading and saving annotation sidecar files, plus computing PDF hash for change detection.

**Commands to implement:**
1. `load_annotations(pdf_path: String) -> Result<Option<AnnotationSidecar>, String>`
   - Derive sidecar path: `{pdf_path}.annotations.json`
   - Read file if exists
   - Parse JSON using serde
   - Return `None` if file doesn't exist

2. `save_annotations(pdf_path: String, annotations: AnnotationSidecar) -> Result<(), String>`
   - Derive sidecar path
   - Serialize to pretty JSON
   - Write to file

3. `compute_pdf_hash(pdf_path: String) -> Result<String, String>`
   - Read PDF bytes
   - Compute SHA-256 hash
   - Return as `sha256:HEX` format

**Dependencies to add to `src-tauri/Cargo.toml`:**
```toml
sha2 = "0.10"
serde = { version = "1.0", features = ["derive"] }
serde_json = "1.0"
```

**Files Created:**
- `src-tauri/src/commands/annotations.rs`

**Files Modified:**
- `src-tauri/src/main.rs` (register commands)
- `src-tauri/src/lib.rs` (if needed for module)
- `src-tauri/Cargo.toml` (dependencies)

**Acceptance Criteria:**
- [ ] `src-tauri/src/commands/annotations.rs` exists
- [ ] Exports three async functions with `#[tauri::command]`
- [ ] `load_annotations` reads sidecar file, returns parsed JSON
- [ ] `save_annotations` writes pretty JSON to sidecar
- [ ] `compute_pdf_hash` returns SHA-256 as hex string
- [ ] Commands registered in `main.rs`: `.invoke_handler()`
- [ ] Rust compiles: `cd src-tauri && cargo build`
- [ ] Commands callable from frontend (test with `invoke()`)

---

### Task 12: Create Annotation Service Layer (Frontend)

**ID:** P3-T12  
**Type:** Service  
**Dependencies:** P3-T11  
**Estimated Effort:** 1-1.5 hours

**Description:**

Create a TypeScript service module that wraps the Tauri annotation commands with type-safe interfaces. Follows the pattern from `src/lib/services/workspace.ts`.

**Functions to implement:**
```typescript
export async function loadAnnotations(pdfPath: string): Promise<AnnotationSidecar | null>
export async function saveAnnotations(pdfPath: string, sidecar: AnnotationSidecar): Promise<void>
export async function computePdfHash(pdfPath: string): Promise<string>
```

Each function:
- Calls `invoke()` from `@tauri-apps/api/core`
- Passes correct command name
- Types parameters and return values
- Handles errors with try/catch

**Files Created:**
- `src/lib/services/annotation-store.ts`

**Files Modified:**
- `tests/persistence.test.ts` (add integration tests)

**Acceptance Criteria:**
- [ ] `src/lib/services/annotation-store.ts` exists
- [ ] Exports three async functions
- [ ] Functions call correct Tauri commands
- [ ] TypeScript types match Tauri command signatures
- [ ] Error handling present
- [ ] Tests pass: `npm run test -- persistence.test.ts`
- [ ] Can successfully save and load annotations (integration test)

---

### Task 13: Implement Sticky Note Component

**ID:** P3-T13  
**Type:** UI Component  
**Dependencies:** P3-T05  
**Estimated Effort:** 2-2.5 hours

**Description:**

Create a component that renders sticky notes as absolutely-positioned HTML divs with contenteditable text areas. Notes appear next to their associated annotation and save content on blur.

**Component structure:**
```svelte
<StickyNoteLayer {annotations} {currentPage} {viewport} {onUpdate} {onDelete} />
```

**Note rendering:**
- Filter to notes on current page
- Position next to annotation rect: `left = rect.x + rect.width + 10px`
- Yellow background (#FFFFCC)
- contenteditable div for note content
- Header with note ID and delete button
- Save on blur event

**Props:**
```typescript
interface Props {
  annotations: Annotation[];
  currentPage: number;
  viewport: PDFViewport;
  onUpdate?: (id: string, content: string) => void;
  onDelete?: (id: string) => void;
}
```

**Files Created:**
- `src/lib/components/pdf/StickyNoteLayer.svelte`

**Files Modified:**
- `tests/sticky-notes.test.ts` (add real tests)

**Acceptance Criteria:**
- [ ] Component exists in `src/lib/components/pdf/`
- [ ] Renders note as absolutely-positioned div
- [ ] contenteditable div allows text editing
- [ ] Saves content on blur event
- [ ] Delete button calls `onDelete` callback
- [ ] Positioned correctly relative to annotation rect
- [ ] Yellow background with border and shadow
- [ ] Only renders notes for current page
- [ ] Tests pass: `npm run test -- sticky-notes.test.ts`
- [ ] No z-index conflicts (notes visible above canvas)

---

### Task 14: Add Page Navigation Controls

**ID:** P3-T14  
**Type:** UI Component  
**Dependencies:** P3-T10  
**Estimated Effort:** 1-1.5 hours

**Description:**

Create a toolbar component with page navigation controls (previous, next, page counter, zoom in/out). Integrates with `PDFViewer` to control current page and scale.

**Controls:**
- Previous page button (← or ◀)
- Page counter: "Page X / Y"
- Next page button (→ or ▶)
- Zoom out button (-)
- Zoom level display: "150%"
- Zoom in button (+)

**Zoom levels:** 50%, 75%, 100%, 125%, 150%, 175%, 200%, 250%, 300%

**Props:**
```typescript
interface Props {
  currentPage: number;
  totalPages: number;
  scale: number;
  onPageChange: (page: number) => void;
  onZoomChange: (scale: number) => void;
}
```

**Files Created:**
- `src/lib/components/pdf/PDFControls.svelte`

**Acceptance Criteria:**
- [ ] Component exists in `src/lib/components/pdf/`
- [ ] Previous/next buttons change page
- [ ] Previous disabled on page 1
- [ ] Next disabled on last page
- [ ] Page counter displays "X / Y"
- [ ] Zoom buttons adjust scale
- [ ] Scale constrained to valid range
- [ ] Buttons have accessible labels
- [ ] CSS follows dark-first pattern
- [ ] Component integrates with `PDFViewer`

---

### Task 15: Implement Page Cache with LRU Eviction

**ID:** P3-T15  
**Type:** Performance  
**Dependencies:** P3-T09  
**Estimated Effort:** 2-3 hours

**Description:**

Create a page caching system that renders the current page plus ±2 adjacent pages, storing up to 10 pages in an LRU cache. This ensures 60fps scrolling on large PDFs.

**Cache structure:**
```typescript
class PageCache {
  private cache: Map<number, CachedPage>;
  private readonly MAX_CACHE = 10;
  
  async renderPage(pdf, pageNum, scale): Promise<HTMLCanvasElement>
  private set(pageNum, canvas)
  private evictOldest()
  clear()
}
```

**Rendering strategy:**
- Current page: render immediately (sync)
- Adjacent pages (±1, ±2): render in background (async)
- Cache hit: return immediately
- Cache miss: render and store

**Eviction policy:** LRU (least recently used) when cache reaches 10 pages.

**Files Created:**
- `src/lib/pdf/page-cache.ts`

**Files Modified:**
- `tests/perf.bench.ts` (add benchmarks)

**Acceptance Criteria:**
- [ ] `src/lib/pdf/page-cache.ts` exports `PageCache` class
- [ ] Cache stores up to 10 pages
- [ ] LRU eviction when cache full
- [ ] Current page + ±2 rendered
- [ ] Cache hit returns immediately
- [ ] Cache miss renders and stores
- [ ] `clear()` method empties cache
- [ ] Benchmark: cache hit < 1ms
- [ ] Benchmark: single page render < 20ms
- [ ] Tests pass: `npm run test:bench -- perf.bench.ts`
- [ ] PDFCanvas imports and uses PageCache for page rendering
- [ ] Cache hit returns pre-rendered canvas within 1ms

---

### Task 16: Implement Zoom/Scroll RAF Throttling

**ID:** P3-T16  
**Type:** Performance  
**Dependencies:** P3-T14, P3-T15  
**Estimated Effort:** 1.5-2 hours

**Description:**

Create a viewport manager that throttles zoom and scroll updates using `requestAnimationFrame` to maintain 60fps performance.

**Class structure:**
```typescript
class ViewportManager {
  private scale: number;
  private pendingUpdate: boolean;
  private pendingZoom: number | null;
  
  handleZoom(delta: number)
  handleScroll(scrollTop: number)
  private applyPendingUpdates()
}
```

**RAF throttling:**
1. User scrolls/zooms → update queued
2. If no pending frame, schedule RAF callback
3. RAF callback applies all pending updates
4. Trigger re-render once per frame (max 60fps)

**Integration:**
- Integrate with `PDFViewer` component
- Update viewport state
- Re-render annotation overlay
- Update page cache

**Files Created:**
- `src/lib/pdf/viewport-manager.ts`

**Files Modified:**
- `src/lib/components/pdf/PDFViewer.svelte` (integrate manager)
- `tests/perf.bench.ts` (add RAF benchmarks)

**Acceptance Criteria:**
- [ ] `src/lib/pdf/viewport-manager.ts` exports `ViewportManager` class
- [ ] Zoom updates throttled with RAF
- [ ] Scroll updates throttled with RAF
- [ ] Multiple rapid updates batched into single frame
- [ ] Integrated with `PDFViewer` component
- [ ] Annotation overlay updates smoothly
- [ ] Benchmark: viewport update < 16ms (60fps)
- [ ] Manual test: smooth zoom/scroll on 50+ page PDF
- [ ] Tests pass: `npm run test:bench`
- [ ] PDFViewer wires onScroll and onZoom events to ViewportManager
- [ ] Frame time stays <16ms during continuous scroll on a 50-page PDF

---

## Performance Targets

| Metric | Target | Measurement |
|--------|--------|-------------|
| Page render time | < 20ms | `npm run test:bench -- perf.bench.ts` |
| Cache hit time | < 1ms | Benchmark in `page-cache.ts` |
| Viewport update (RAF) | < 16ms | Benchmark in `viewport-manager.ts` |
| Full PDF load (50 pages) | < 5s | Manual test with large PDF |
| Scroll frame time | < 16ms | Monitor with `performance.now()` |
| Annotation render | < 5ms | Benchmark in overlay component |

**Verification:** Before marking Phase 3 complete, run performance benchmarks and verify all targets met.

---

## Testing Strategy

### Unit Tests
- Coordinate transforms (round-trip accuracy)
- Text selection handler (rect extraction)
- Annotation store (CRUD operations)
- Page cache (LRU eviction)

### Integration Tests
- PDF loading and rendering
- Annotation persistence (save/load cycle)
- Multi-page navigation
- Sticky note editing

### Performance Benchmarks
- Page render time
- Cache hit/miss performance
- RAF throttling effectiveness
- Full PDF load time

### Manual Verification
- Visual alignment of highlights with text
- Smooth zoom/scroll on large PDF
- Sticky note positioning
- Color accuracy for highlights/underlines
- 60fps during interaction

**Run tests:** `npm run test`  
**Run benchmarks:** `npm run test:bench`

---

## File Structure (Created by Phase 3)

```
src/lib/
├── components/pdf/
│   ├── PDFViewer.svelte          # Main viewer component
│   ├── PDFCanvas.svelte           # Canvas rendering
│   ├── AnnotationOverlay.svelte   # SVG overlay
│   ├── StickyNoteLayer.svelte     # Sticky notes
│   ├── PDFControls.svelte         # Navigation toolbar
│   └── AnnotationToolbar.svelte   # Annotation creation UI
├── pdf/
│   ├── pdf-init.ts                # Worker setup
│   ├── text-selection.ts          # Selection handler
│   ├── coordinate-transforms.ts   # PDF↔Canvas mapping
│   ├── page-cache.ts              # LRU cache
│   └── viewport-manager.ts        # RAF throttling
├── services/
│   └── annotation-store.ts        # Tauri IPC wrapper
├── stores/
│   └── annotations.ts             # Svelte store
└── types/
    └── annotation.ts              # Type definitions

src-tauri/src/commands/
└── annotations.rs                 # Rust commands

tests/
├── setup.ts                       # Test config
├── pdf-rendering.test.ts          # Canvas tests
├── text-selection.test.ts         # Selection tests
├── annotations.test.ts            # Store tests
├── coordinate-transform.test.ts   # Transform tests
├── sticky-notes.test.ts           # Note tests
├── persistence.test.ts            # Sidecar I/O tests
└── perf.bench.ts                  # Performance benchmarks

vitest.config.ts                   # Test configuration
```

---

## Dependencies on Phase 2

Phase 3 assumes Phase 2 provides:
- `Paper` interface with `id` and `localPdfPath` fields
- Paper list UI that can trigger PDF viewer
- Paper service for loading paper metadata

If Phase 2 incomplete, Task 10 (Integration) will need:
- Mock Paper interface for development
- Hardcoded PDF path for testing
- Stub paper list component

---

## Known Limitations (Deferred to Phase 4+)

The following are explicitly OUT OF SCOPE for Phase 3:

- **pdfium-render integration:** Structural text extraction for knowledge graph
- **OCR for scanned PDFs:** Use PDF.js text extraction only
- **Advanced annotation types:** Arrow, callout, drawing tools
- **Annotation export to PDF:** Embed annotations in PDF file
- **Full-text search:** Defer to Phase 4 with pdfium-render
- **Metadata extraction:** Title, author, DOI from PDF
- **Multi-selection:** Select from multiple annotations at once
- **Annotation history:** Undo/redo for annotations

These features have been evaluated and deferred based on MVP scope and research findings (phase3-research.md).

---

## Risk Mitigation

| Risk | Impact | Mitigation |
|------|--------|------------|
| Coordinate transform bugs | High | TDD approach (Task 5), visual verification |
| PDF.js worker path issues | High | Use Vite `?url` pattern, test early (Task 1) |
| Performance on large PDFs | Medium | Implement caching early (Task 15), benchmark continuously |
| Annotation misalignment | High | Store in PDF coords, recalculate on zoom (Task 8) |
| Selection API edge cases | Medium | Test multi-line, empty selection (Task 6) |
| Sticky note z-index conflicts | Low | Re-render on page change (Task 13) |

---

## Commit Strategy

After each task completion:
```bash
git add -A
git commit -m "feat(pdf): [task description]"
```

Example commits:
- `feat(pdf): configure PDF.js worker with Vite`
- `feat(pdf): implement coordinate transforms with tests`
- `feat(pdf): create SVG annotation overlay component`
- `feat(pdf): add sticky note layer with contenteditable`
- `perf(pdf): implement page cache with LRU eviction`

After phase completion:
```bash
git tag phase-3-complete
git push --tags
```

---

## Phase 3 Completion Checklist

Before marking Phase 3 complete:

### Functionality
- [ ] PDF opens and renders in canvas
- [ ] User can select text and see bounding rects
- [ ] Highlight creation works (yellow, green, red)
- [ ] Underline creation works
- [ ] Sticky note creation and editing works
- [ ] Annotations save to sidecar file
- [ ] Annotations load on PDF reopen
- [ ] Page navigation works (prev/next)
- [ ] Zoom in/out works

### Performance
- [ ] Page render < 20ms (benchmark)
- [ ] Cache hit < 1ms (benchmark)
- [ ] Viewport update < 16ms (benchmark)
- [ ] 60fps during scroll/zoom (manual test)

### Quality
- [ ] All unit tests pass: `npm run test`
- [ ] All benchmarks pass: `npm run test:bench`
- [ ] TypeScript compiles without errors
- [ ] Rust compiles without errors
- [ ] No console errors in browser
- [ ] Visual verification: highlights align with text

### Documentation
- [ ] PHASE_3_SUMMARY.md created with:
  - What was built
  - Key decisions made
  - Files created/modified
  - Known issues or limitations
  - Performance metrics

---

**Ready for Phase 4:** Once checklist complete, Phase 3 is done and Phase 4 (Knowledge Graph) can begin.
