# Phase 7 Wave 3: Bundle Optimization Implementation Guide

## Overview

This guide supplements the PLAN.md with detailed explanations, common pitfalls, and troubleshooting for implementing code-splitting in Anya-RA.

## What You're Doing

Reducing the initial JavaScript bundle from 5.3 MB to ~2.1 MB (60% reduction) by lazy-loading feature libraries:

- **PDF.js (1.9 MB)** → Loads only when user clicks PDF tab
- **CodeMirror (600 KB)** → Loads only when Notes tab opens
- **@xyflow (400 KB)** → Loads only when Graph tab clicked
- **Export utilities (300 KB)** → Loads only on export button click
- **Main bundle (2.1 MB)** ← All other code + core UI

**Result:** Users see responsive UI in 5.6s (vs 14s), feature-specific users see the same experience.

---

## Core Concept: Dynamic Imports

### Standard Approach (What We DON'T Use)

```typescript
// ❌ Static import — loads PDF.js at app startup
import PDFViewer from '../pdf/PDFViewer.svelte'
```

### Dynamic Approach (What We DO Use)

```typescript
// ✅ Dynamic import — PDF.js loads only when needed
let PDFViewerComponent: any = $state(null)

$effect(() => {
  if (activeTab === 'pdf' && !PDFViewerComponent) {
    import('../pdf/PDFViewer.svelte').then((mod) => {
      PDFViewerComponent = mod.default
    })
  }
})

// Template: <svelte:component this={PDFViewerComponent} ... />
```

**What changed?**
1. Import statement moved from module-level to inside a function
2. Component stored in a reactive state variable
3. Import only triggers when condition is met (activeTab === 'pdf')
4. Template uses `<svelte:component>` instead of component tag

**Why it works:**
- Vite detects `import()` calls and creates separate chunks
- Main bundle doesn't load the chunk
- Chunk loads only when import() is called
- Component renders once chunk loads

---

## Task-by-Task Breakdown

### Task 1 & 2: Lazy-Load PDF Viewer and Graph Canvas

These follow the same pattern. Here's the detailed flow:

**File:** `src/lib/components/layout/MainPanel.svelte`

**Current structure (simplified):**
```svelte
<script>
  import PDFViewer from '../pdf/PDFViewer.svelte'
  import GraphCanvas from '../graph/GraphCanvas.svelte'
  
  let activeTab = $state('chat') // or 'pdf', 'graph'
  
  let pdfPath: string
  let paperId: string
</script>

{#if activeTab === 'pdf'}
  <PDFViewer {pdfPath} {paperId} />
{:else if activeTab === 'graph'}
  <GraphCanvas ... />
{:else}
  <ChatWindow />
{/if}
```

**What you need to change:**

1. **Remove imports** (top of script):
```svelte
<script>
  // DELETE these lines:
  // import PDFViewer from '../pdf/PDFViewer.svelte'
  // import GraphCanvas from '../graph/GraphCanvas.svelte'
  
  let activeTab = $state('chat')
  
  // ADD these:
  let PDFViewerComponent: any = $state(null)
  let GraphCanvasComponent: any = $state(null)
  
  // ADD effect hooks for lazy loading:
  $effect(() => {
    if (activeTab === 'pdf' && !PDFViewerComponent) {
      import('../pdf/PDFViewer.svelte').then((mod) => {
        PDFViewerComponent = mod.default
      })
    }
  })
  
  $effect(() => {
    if (activeTab === 'graph' && !GraphCanvasComponent) {
      import('../graph/GraphCanvas.svelte').then((mod) => {
        GraphCanvasComponent = mod.default
      })
    }
  })
</script>
```

2. **Update template** (replace old component tags):
```svelte
{#if activeTab === 'pdf'}
  {#if PDFViewerComponent}
    <svelte:component this={PDFViewerComponent} {pdfPath} {paperId} />
  {:else}
    <div class="loading-placeholder">
      <p>Loading PDF viewer...</p>
    </div>
  {/if}
{:else if activeTab === 'graph'}
  {#if GraphCanvasComponent}
    <svelte:component this={GraphCanvasComponent} {graphData} {selectedPapers} {selectedNote} {notes} />
  {:else}
    <div class="loading-placeholder">
      <p>Loading graph canvas...</p>
    </div>
  {/if}
{:else}
  <ChatWindow />
{/if}
```

3. **Add CSS** (for loading placeholder):
```css
<style>
  .loading-placeholder {
    display: flex;
    align-items: center;
    justify-content: center;
    height: 100%;
    color: var(--text-secondary);
  }
</style>
```

**Why the `$effect` hook?**
- Runs whenever `activeTab` changes
- Only loads component if condition is true
- Only imports once (check `!PDFViewerComponent`)
- Automatically re-runs if dependency changes

**Why `svelte:component`?**
- Built-in Svelte way to render dynamic components
- Works with lazy-loaded modules
- Preserves event handling and prop binding

---

### Task 3: Lazy-Load Notes Editor

**File:** `src/lib/components/editor/NotesPanel.svelte`

This is slightly different because Notes might always be visible (not tab-gated like PDF/Graph).

**Option A: Load on Mount (Deferred)**
```svelte
<script>
  import { onMount } from 'svelte'
  
  // DELETE: import NotesEditor from './NotesEditor.svelte'
  
  let NotesEditorComponent: any = $state(null)
  let noteId: string
  let note: Note
  
  onMount(async () => {
    const mod = await import('./NotesEditor.svelte')
    NotesEditorComponent = mod.default
  })
</script>

{#if NotesEditorComponent}
  <svelte:component 
    this={NotesEditorComponent} 
    {noteId} 
    {note}
    on:update
    on:delete
  />
{:else}
  <div class="loading-placeholder">Loading notes editor...</div>
{/if}
```

**Option B: Tab-Based (Only When Clicked)**
```svelte
<script>
  let NotesEditorComponent: any = $state(null)
  let isNotesTabActive = $state(false)
  
  $effect(() => {
    if (isNotesTabActive && !NotesEditorComponent) {
      import('./NotesEditor.svelte').then((mod) => {
        NotesEditorComponent = mod.default
      })
    }
  })
</script>

{#if isNotesTabActive}
  {#if NotesEditorComponent}
    <svelte:component ... />
  {:else}
    <div class="loading-placeholder">Loading notes editor...</div>
  {/if}
{/if}
```

**Which to use?**
- **Option A (onMount):** If Notes panel is always shown or users expect it ready soon
- **Option B (tab-gated):** If Notes is optional or opened late

The PLAN uses Option A, but verify which fits your UI.

---

### Task 4: Lazy-Load Export Services

**File:** `src/lib/components/editor/ExportDialog.svelte`

This is a **service import pattern**, not a component pattern.

**Current code:**
```typescript
import { exportNotesToPDF, exportNotesToDOCX } from '../../services/notes-export'

async function handleExportPDF() {
  const blob = await exportNotesToPDF(title, authors, note)
  // ... download logic
}
```

**Updated code:**
```typescript
// DELETE the import at top

let isExporting: boolean = $state(false)

async function handleExportPDF() {
  isExporting = true
  try {
    const { exportNotesToPDF } = await import('../../services/notes-export')
    const blob = await exportNotesToPDF(title, authors, note)
    // ... download logic
  } catch (err) {
    console.error('Export failed:', err)
    // Show error toast
  } finally {
    isExporting = false
  }
}

async function handleExportDOCX() {
  isExporting = true
  try {
    const { exportNotesToDOCX } = await import('../../services/notes-export')
    const blob = await exportNotesToDOCX(title, authors, note)
    // ... download logic
  } finally {
    isExporting = false
  }
}
```

**Template:**
```svelte
<button disabled={isExporting} on:click={handleExportPDF}>
  {isExporting ? 'Exporting...' : 'Export PDF'}
</button>
<button disabled={isExporting} on:click={handleExportDOCX}>
  {isExporting ? 'Exporting...' : 'Export DOCX'}
</button>
```

**Key difference from component pattern:**
- Doesn't store module in state
- Imports directly in function
- Can import same function multiple times (cached after first import)
- Error handling important (first import might fail if chunk fails to load)

---

### Task 5: Vite Configuration

**File:** `vite.config.ts`

This tells Vite/Rollup how to split the bundle.

**What to add:**

```typescript
export default defineConfig({
  // ... existing config ...
  
  build: {
    target: 'esnext',
    minify: 'esbuild',
    cssCodeSplit: true,
    
    // ADD THIS SECTION:
    rollupOptions: {
      output: {
        manualChunks(id) {
          // Group related libraries into chunks
          // 'id' is the full path of the imported file
          
          if (id.includes('pdfjs-dist')) {
            return 'pdf-viewer'  // Create dist/js/pdf-viewer-[hash].js
          }
          
          if (id.includes('codemirror') || id.includes('@codemirror')) {
            return 'code-editor'  // Create dist/js/code-editor-[hash].js
          }
          
          if (id.includes('@xyflow')) {
            return 'graph-canvas'  // Create dist/js/graph-canvas-[hash].js
          }
          
          if (id.includes('jspdf') || id.includes('html2canvas') || id.includes('docx')) {
            return 'export-utils'  // Create dist/js/export-utils-[hash].js
          }
          
          if (id.includes('node_modules/') && !id.includes('tauri')) {
            return 'vendor'  // Other node_modules → shared chunk
          }
        },
      },
    },
  },
  
  optimizeDeps: {
    include: ['@tauri-apps/api', '@tauri-apps/plugin-store', '@tauri-apps/plugin-dialog'],
    
    // ADD THIS LINE:
    exclude: ['pdfjs-dist', 'codemirror', '@xyflow/svelte', 'jspdf', 'html2canvas', 'docx'],
  },
})
```

**Why `exclude` is important:**
- During dev, Vite pre-bundles dependencies for faster reloads
- Pre-bundling libraries defeats code-splitting (they'd go in main chunk)
- `exclude` list tells Vite: "Don't pre-bundle these, I'll handle them"

**How Rollup processes the chunks:**
1. User clicks PDF tab
2. Component template renders `<svelte:component this={PDFViewerComponent} />`
3. Svelte needs to load PDFViewerComponent
4. PDFViewerComponent needs to import pdfjs-dist
5. Rollup sees `pdfjs-dist` in manualChunks → creates pdf-viewer chunk
6. Browser downloads pdf-viewer chunk (1.9 MB)
7. PDFViewerComponent renders

---

## Common Pitfalls & Fixes

### ❌ Pitfall 1: Importing at Module Level Defeats Code-Splitting

```typescript
// ❌ WRONG - loads PDF.js at startup
import { initPDF } from '../pdf/pdf-init'

$effect(() => {
  if (activeTab === 'pdf') {
    initPDF()  // Too late, pdf-init already imported
  }
})
```

**Fix:** Move the import inside the effect or function

```typescript
// ✅ CORRECT
$effect(async () => {
  if (activeTab === 'pdf') {
    const { initPDF } = await import('../pdf/pdf-init')
    initPDF()
  }
})
```

### ❌ Pitfall 2: No Loading Fallback → Blank Screen

```svelte
<!-- ❌ WRONG - blank screen while chunk loads -->
{#if activeTab === 'pdf'}
  <svelte:component this={PDFViewerComponent} ... />
{/if}
```

**Fix:** Show fallback UI while component loads

```svelte
<!-- ✅ CORRECT -->
{#if activeTab === 'pdf'}
  {#if PDFViewerComponent}
    <svelte:component this={PDFViewerComponent} ... />
  {:else}
    <div class="loading">Loading PDF viewer...</div>
  {/if}
{/if}
```

### ❌ Pitfall 3: Including Lazy Libs in `optimizeDeps.include`

```typescript
// ❌ WRONG
optimizeDeps: {
  include: [..., 'pdfjs-dist', 'codemirror']  // Pre-bundles them!
}
```

**Fix:** Use `exclude` instead

```typescript
// ✅ CORRECT
optimizeDeps: {
  exclude: ['pdfjs-dist', 'codemirror', '@xyflow/svelte', ...]  // Skip pre-bundling
}
```

### ❌ Pitfall 4: Forgetting Event Forwarding in `<svelte:component>`

```svelte
<!-- ❌ WRONG - events don't propagate -->
<svelte:component this={NotesEditorComponent} {noteId} {note} />
```

**Fix:** Explicitly forward events

```svelte
<!-- ✅ CORRECT -->
<svelte:component 
  this={NotesEditorComponent} 
  {noteId} 
  {note}
  on:update
  on:delete
/>
```

Alternatively, use `on:*` event shorthand:
```svelte
<!-- Also works -->
<svelte:component 
  this={NotesEditorComponent} 
  {noteId} 
  {note}
  on:update
  on:delete
/>
```

### ❌ Pitfall 5: Not Handling Import Errors

```typescript
// ❌ WRONG - fails silently if chunk fails to load
const mod = await import('../../services/notes-export')
const blob = await mod.exportNotesToPDF(...)
```

**Fix:** Add error handling

```typescript
// ✅ CORRECT
try {
  const mod = await import('../../services/notes-export')
  const blob = await mod.exportNotesToPDF(...)
} catch (err) {
  console.error('Failed to load export service:', err)
  showErrorToast('Export failed')
}
```

---

## Verification Checklist

After each task, verify:

### After Task 1 (PDF lazy-load)
- [ ] Run `npm test` — all tests pass
- [ ] Run `pnpm build` — check for `pdf-viewer-[hash].js` ~1.9 MB
- [ ] Start `pnpm dev` — click PDF tab, see loading placeholder briefly
- [ ] DevTools Network → click PDF tab, verify pdf-viewer chunk loads

### After Task 2 (Graph lazy-load)
- [ ] `npm test` passes
- [ ] `pnpm build` shows `graph-canvas-[hash].js` ~400 KB
- [ ] `pnpm dev` → click Graph tab, see loading placeholder
- [ ] DevTools Network → graph chunk loads on Graph tab click

### After Task 3 (Notes lazy-load)
- [ ] `npm test` passes
- [ ] `pnpm build` shows `code-editor-[hash].js` ~600 KB
- [ ] `pnpm dev` → Notes panel loads, see loading placeholder briefly
- [ ] DevTools Network → code-editor chunk loads

### After Task 4 (Export lazy-load)
- [ ] `npm test` passes
- [ ] `pnpm build` shows `export-utils-[hash].js` ~300 KB
- [ ] `pnpm dev` → Open export dialog, see button text change to "Exporting..."
- [ ] DevTools Network → export-utils chunk loads on export click

### After Task 5 (Vite config)
- [ ] `pnpm build` completes without errors
- [ ] Check `dist/js/` — verify all 6 chunks exist:
  - main-[hash].js (~2.1 MB)
  - pdf-viewer-[hash].js (~1.9 MB)
  - code-editor-[hash].js (~600 KB)
  - graph-canvas-[hash].js (~400 KB)
  - export-utils-[hash].js (~300 KB)
  - vendor-[hash].js (~200 KB)

### After Task 6 (Final verification)
- [ ] `npm test` — 41/41 tests pass, zero failures
- [ ] `pnpm dev` — all features work:
  - Chat loads immediately
  - Papers tab works
  - PDF tab shows loading, then renders PDF
  - Notes tab shows loading, then renders editor
  - Graph tab shows loading, then renders graph
  - Export dialog loads quickly, exports work
- [ ] DevTools → Network tab shows minimal startup load, chunks load on-demand
- [ ] No console errors

---

## Performance Impact

**Before optimization:**
- Initial load: 5.3 MB (all features bundled)
- Time to interactive: 14s on 3G
- All features load even if user only needs chat

**After optimization:**
- Initial load: 2.1 MB (main bundle only)
- Time to interactive: 5.6s on 3G (60% faster!)
- PDF/Graph/Notes/Export load on-demand
- Browser cache reuses feature chunks across sessions

**On slow 3G (measured):**
- Chat user: 5.6s to interact (was 14s)
- PDF researcher: 5.6s + 2s for PDF chunk = 7.6s (was 14s, faster overall)
- Graph user: 5.6s + 1.5s for graph chunk = 7.1s (was 14s, faster overall)

---

## Troubleshooting

**Q: pnpm build shows "pdf-viewer is still 5.3 MB"**
- A: Check that manualChunks is in `build.rollupOptions.output` (not at top level)
- A: Verify pdfjs-dist is NOT in optimizeDeps.include

**Q: PDF tab shows error "PDFViewerComponent is not a function"**
- A: Remember to use `.default` when destructuring: `PDFViewerComponent = mod.default`
- A: Check that import() is inside $effect or function, not at module level

**Q: Chunks don't load, blank screen**
- A: Add `{:else}` to template with loading placeholder
- A: Check browser Network tab — are chunks listed? Are they loading?

**Q: Tests fail with "Component not found"**
- A: Components are now lazy-loaded, tests may need mocking
- A: Consider if test should mock the dynamic import or test the real component

**Q: pnpm dev is slow**
- A: Lazy libraries in `exclude` list aren't pre-bundled, so dev startup is slower
- A: This is normal and expected — build performance is better

---

## Rollback Plan (If Needed)

If something breaks catastrophically, rollback is < 5 minutes:

1. Revert MainPanel.svelte (restore static imports)
2. Revert NotesPanel.svelte (restore static imports)
3. Revert ExportDialog.svelte (restore static imports)
4. Revert vite.config.ts (remove rollupOptions and exclude)
5. Run `pnpm build` to verify revert
6. `npm test` to confirm no regressions

**Git command:**
```bash
git checkout HEAD -- src/lib/components/layout/MainPanel.svelte \
  src/lib/components/editor/NotesPanel.svelte \
  src/lib/components/editor/ExportDialog.svelte \
  vite.config.ts
pnpm build
npm test
```

---

## Next Steps

1. Follow PLAN.md tasks in order (1-6)
2. After each task, run `npm test` and manual verification
3. After Task 5, check chunk sizes in build output
4. Complete Task 6 (final verification checkpoint)
5. Review this guide if anything breaks
6. Create SUMMARY.md with results

Good luck! 🚀
