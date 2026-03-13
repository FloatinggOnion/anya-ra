# Code-Splitting Implementation Checklist

Quick reference for implementing the 5 optimization phases.

## Phase 1: Lazy-Load PDF.js (Save 1.9 MB)

**File:** `src/lib/components/layout/MainPanel.svelte`

- [ ] Remove static import: `import PDFViewer from '../pdf/PDFViewer.svelte'`
- [ ] Add state for component: `let PDFViewerComponent: any = $state(null)`
- [ ] Add function to load component dynamically
- [ ] Call load function when `activeTab === 'pdf'` (or preload on hover)
- [ ] Update template to use `<svelte:component this={PDFViewerComponent} />`
- [ ] Add loading fallback UI: `{#if PDFViewerComponent}...{/if}`
- [ ] Test: PDF tab should not load pdf.worker until clicked
- [ ] Verify: `pnpm build` output shows pdf-viewer chunk ~1.9 MB

**Verification:**
```bash
# Run build and check for pdf-viewer chunk
pnpm build
# Look for: dist/js/pdf-viewer-[hash].js ~1.9 MB
```

---

## Phase 2: Lazy-Load CodeMirror (Save 600 KB)

**File:** `src/lib/components/editor/NotesPanel.svelte`

- [ ] Remove static import: `import NotesEditor from './NotesEditor.svelte'`
- [ ] Add state for component: `let NotesEditorComponent: any = $state(null)`
- [ ] Add function to load component dynamically
- [ ] Call load function in `onMount` or when Notes tab opens
- [ ] Update template to use `<svelte:component this={NotesEditorComponent} />`
- [ ] Add loading fallback UI
- [ ] Optional: Preload on hover for better UX
- [ ] Test: Notes tab should not load CodeMirror until clicked
- [ ] Verify: `pnpm build` output shows code-editor chunk ~600 KB

**Verification:**
```bash
pnpm build
# Look for: dist/js/code-editor-[hash].js ~600 KB
```

---

## Phase 3: Lazy-Load Graph Canvas (Save 400 KB)

**File:** `src/lib/components/layout/MainPanel.svelte`

- [ ] Remove static import: `import GraphCanvas from '../graph/GraphCanvas.svelte'`
- [ ] Add state for component: `let GraphCanvasComponent: any = $state(null)`
- [ ] Add function to load component dynamically
- [ ] Call load function when `activeTab === 'graph'` (or preload on hover)
- [ ] Update template to use `<svelte:component this={GraphCanvasComponent} />`
- [ ] Add loading fallback UI
- [ ] Test: Graph tab should not load @xyflow until clicked
- [ ] Verify: `pnpm build` output shows graph-canvas chunk ~400 KB

**Verification:**
```bash
pnpm build
# Look for: dist/js/graph-canvas-[hash].js ~400 KB
```

---

## Phase 4: Lazy-Load Export Services (Save 300 KB)

**File:** `src/lib/components/editor/ExportDialog.svelte`

- [ ] Remove static imports of `jsPDF`, `html2canvas`, `docx`, `exportNotesToPDF`
- [ ] In `handleExportPDF()`: Add dynamic import before use
  ```typescript
  const { exportNotesToPDF } = await import('../../services/notes-export')
  ```
- [ ] In `handleExportDocx()`: Add dynamic import before use
  ```typescript
  const { exportNotesToDOCX } = await import('../../services/notes-export')
  ```
- [ ] Add loading state UI (button shows "Exporting..." while chunk loads)
- [ ] Test: Export utils should not load until export button clicked
- [ ] Verify: `pnpm build` output shows export-utils chunk ~300 KB

**Verification:**
```bash
pnpm build
# Look for: dist/js/export-utils-[hash].js ~300 KB
```

---

## Phase 5: Vite Configuration (Chunk Grouping)

**File:** `vite.config.ts`

- [ ] Add `rollupOptions` to `build` section
- [ ] Add `manualChunks()` function grouping:
  - PDF.js → `chunks/pdf-viewer`
  - CodeMirror → `chunks/code-editor`
  - @xyflow → `chunks/graph-canvas`
  - jsPDF, html2canvas, docx → `chunks/export-utils`
  - Other node_modules → `chunks/vendor`
- [ ] Update `optimizeDeps` to exclude lazy-loaded libraries:
  ```typescript
  exclude: ['pdfjs-dist', 'codemirror', '@xyflow/svelte', 'jspdf', 'html2canvas', 'docx']
  ```
- [ ] Run `pnpm build` and verify chunks appear correctly
- [ ] Check that main chunk is ~2.1 MB (down from 5.3 MB)

**Verification:**
```bash
pnpm build
# Expected output:
# dist/js/main-[hash].js          210 kB  (was 5300 kB)
# dist/js/pdf-viewer-[hash].js    1.9 MB
# dist/js/code-editor-[hash].js   600 kB
# dist/js/graph-canvas-[hash].js  400 kB
# dist/js/export-utils-[hash].js  300 kB
# dist/js/vendor-[hash].js        200 kB
```

---

## Final Validation

After all phases complete:

- [ ] **Bundle Size:** `pnpm build` main chunk < 2.5 MB
- [ ] **Network Tab:** All chunks load on-demand, not on startup
- [ ] **Lighthouse FCP:** Should improve to ~12s (from ~30s on 3G)
- [ ] **Lighthouse TTI:** Should improve 60%+ on 3G
- [ ] **Cold Load:** First load ~2.1 MB → interactive ~5.6s (was 14s)
- [ ] **Warm Load:** Repeat visit uses cached chunks, much faster
- [ ] **PDF Tab:** pdf.worker loads on first PDF view, not at startup
- [ ] **Notes Tab:** CodeMirror loads on first Notes view
- [ ] **Graph Tab:** @xyflow loads on first Graph view
- [ ] **Export:** jsPDF/docx load on first export button click
- [ ] **No Errors:** Console clean, no missing chunks
- [ ] **Hover Preload:** Optional tabs preload on hover for perceived speed

---

## Rollback Plan

If issues arise:

1. Revert `MainPanel.svelte` to static imports
2. Revert `NotesPanel.svelte` to static imports
3. Revert `ExportDialog.svelte` to static imports
4. Revert `vite.config.ts` to original (remove manualChunks, restore optimizeDeps)
5. Run `pnpm build` to verify revert

Time to rollback: < 5 minutes

---

## Common Issues & Fixes

| Issue | Cause | Fix |
|-------|-------|-----|
| "Component not found" | Await not used on dynamic import | `const mod = await import(...); Component = mod.default` |
| Blank screen on tab click | Loading fallback not shown | Add `{#if Component}..{else}Loading...{/if}` |
| pdf.worker 404 error | Path broken in lazy chunk | Keep `?url` import in pdf-init.ts, don't change |
| HMR not working | Module not reloaded | Vite HMR works with dynamic imports, check browser cache |
| Larger main chunk | Manual chunks not applied | Verify `vite.config.ts` build.rollupOptions exists |
| Slow export on first use | Service loads on demand | Expected, show "Loading..." state |

---

## Documentation Links

For detailed implementation:
- See `.planning/RESEARCH.md` sections:
  - "Code Examples" — Complete working examples
  - "Architecture Patterns" — How each pattern works
  - "Common Pitfalls" — What to avoid
  - "Vite Config" — Full configuration reference

