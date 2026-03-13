---
phase: 07-polish-performance
plan: wave3
type: execute
wave: 3
depends_on: []
files_modified:
  - src/lib/components/layout/MainPanel.svelte
  - src/lib/components/editor/NotesPanel.svelte
  - src/lib/components/editor/ExportDialog.svelte
  - src/lib/services/notes-export.ts
  - vite.config.ts
autonomous: true
requirements:
  - PERF-01
  - PERF-02
  - PERF-03
must_haves:
  truths:
    - "Main bundle loads in <2.5 MB (down from 5.3 MB)"
    - "PDF.js lazy-loads only when PDF tab clicked (1.9 MB saved at startup)"
    - "CodeMirror lazy-loads only when Notes tab opened (600 KB saved at startup)"
    - "Graph canvas lazy-loads only when Graph tab clicked (400 KB saved at startup)"
    - "Export utilities lazy-load only on export dialog open (300 KB saved at startup)"
    - "Initial load time improves 60% (14s → 5.6s on 3G)"
    - "All 41 tests continue to pass with zero regressions"
  artifacts:
    - path: "src/lib/components/layout/MainPanel.svelte"
      provides: "Dynamic PDF/Graph component loading with fallback UI"
      min_lines: 50
    - path: "src/lib/components/editor/NotesPanel.svelte"
      provides: "Dynamic NotesEditor component loading"
      min_lines: 30
    - path: "src/lib/components/editor/ExportDialog.svelte"
      provides: "Dynamic export service import on button click"
      min_lines: 40
    - path: "vite.config.ts"
      provides: "Manual chunks config grouping lazy-loaded libraries"
      exports:
        - "manualChunks function"
        - "optimizeDeps exclude array"
  key_links:
    - from: "MainPanel.svelte"
      to: "PDFViewer.svelte"
      via: "dynamic import in $effect block"
      pattern: "import.*PDFViewer.*when.*activeTab.*pdf"
    - from: "MainPanel.svelte"
      to: "GraphCanvas.svelte"
      via: "dynamic import in $effect block"
      pattern: "import.*GraphCanvas.*when.*activeTab.*graph"
    - from: "NotesPanel.svelte"
      to: "NotesEditor.svelte"
      via: "dynamic import in onMount"
      pattern: "import.*NotesEditor"
    - from: "ExportDialog.svelte"
      to: "notes-export service"
      via: "dynamic import in handler function"
      pattern: "import.*notes-export.*when.*handleExport"
    - from: "vite.config.ts"
      to: "pdfjs-dist"
      via: "manualChunks grouping"
      pattern: "id\\.includes.*pdfjs"
    - from: "build output"
      to: "dist/js/ chunks"
      via: "rollupOptions.output.manualChunks"
      pattern: "pdf-viewer.*code-editor.*graph-canvas.*export-utils"
---

<objective>
Reduce Anya-RA initial bundle from 5.3 MB to 2.1 MB (60% reduction) using Vite 6.0 code-splitting and lazy-loading for optional feature libraries.

**Purpose:** 
Users accessing PDF-free features (chat, search, papers) experience 60% faster startup (14s → 5.6s on 3G). Heavy libraries (PDF.js, CodeMirror, @xyflow, export utilities) load only when needed.

**Output:**
- Five lazy-loadable chunks (pdf-viewer, code-editor, graph-canvas, export-utils, vendor)
- Dynamic component imports for tab-based UI
- Updated Vite config with manual chunks strategy
- Bundle size reduction verified via `pnpm build` output
- Zero test regressions (all 41 tests passing)
</objective>

<execution_context>
@/Users/paul/.claude/get-shit-done/workflows/execute-plan.md
@/Users/paul/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/PROJECT.md
@.planning/ROADMAP.md
@.planning/STATE.md
@.planning/RESEARCH.md
@.planning/OPTIMIZATION_CHECKLIST.md

## Current Bundle Analysis
- Main bundle: 5.3 MB (unoptimized)
- PDF.js contribution: 1.9 MB (36%)
- CodeMirror contribution: 600 KB (11%)
- @xyflow/svelte contribution: 400 KB (7%)
- Export libraries contribution: 300 KB (5%)
- Other dependencies: 1.7 MB (32%)

## Key Decisions from Research
- **No custom solutions:** Use native Vite 6.0 + Svelte 5 patterns only
- **PDF.js strategy:** Already correct with `?url` worker import; keep pdf-init.ts as-is
- **Code splitting strategy:** Dynamic imports + manual chunks config
- **Rollback plan:** All changes are reversible in < 5 minutes

## Target Metrics
- Main chunk: < 2.5 MB (was 5.3 MB)
- PDF chunk: ~1.9 MB (lazy-loaded)
- Code editor chunk: ~600 KB (lazy-loaded)
- Graph chunk: ~400 KB (lazy-loaded)
- Export utils chunk: ~300 KB (lazy-loaded)
- Vendor chunk: ~200 KB (shared dependencies)
- **Time to interactive improvement:** 14s → 5.6s (60% faster on 3G)

## Architecture Patterns Used

### Pattern 1: Dynamic Component Import (Svelte 5)
```typescript
let PDFViewerComponent: typeof import('../pdf/PDFViewer.svelte').default | null = $state(null)

$effect(() => {
  if (activeTab === 'pdf') {
    import('../pdf/PDFViewer.svelte').then((mod) => {
      PDFViewerComponent = mod.default
    })
  }
})

// In template: <svelte:component this={PDFViewerComponent} {...props} />
```

### Pattern 2: Dynamic Service Import
```typescript
async function handleExportPDF() {
  if (!exportService) {
    exportService = await import('../../services/notes-export')
  }
  await exportService.exportNotesToPDF(...)
}
```

### Pattern 3: Manual Chunks Config
Groups related dependencies to avoid duplication and improve cache reuse:
```typescript
rollupOptions: {
  output: {
    manualChunks(id) {
      if (id.includes('pdfjs-dist')) return 'pdf-viewer'
      if (id.includes('codemirror')) return 'code-editor'
      // ... etc
    }
  }
}
```

## Interfaces & Types Needed

From existing codebase:

**MainPanel.svelte current imports:**
```typescript
import PDFViewer from '../pdf/PDFViewer.svelte'
import GraphCanvas from '../graph/GraphCanvas.svelte'
```

**NotesPanel.svelte current structure:**
```typescript
import NotesEditor from './NotesEditor.svelte'
```

**ExportDialog.svelte current imports:**
```typescript
// Will move to dynamic imports
export async function exportNotesToPDF(...): Promise<Blob>
export async function exportNotesToDOCX(...): Promise<Blob>
```

</context>

<tasks>

<task type="auto">
  <name>Task 1: Lazy-Load PDF.js (Priority 1 — saves 1.9 MB)</name>
  <files>src/lib/components/layout/MainPanel.svelte</files>
  <action>
Replace static import of PDFViewer with dynamic loading pattern:

**Current code (line 4):**
```
import PDFViewer from '../pdf/PDFViewer.svelte'
```

**Changes:**
1. Remove the static import of PDFViewer (line 4)
2. Add state for the component after imports:
```typescript
let PDFViewerComponent: any = $state(null)
```

3. Add effect hook to load PDFViewer dynamically when activeTab === 'pdf':
```typescript
$effect(() => {
  if (activeTab === 'pdf' && !PDFViewerComponent) {
    import('../pdf/PDFViewer.svelte').then((mod) => {
      PDFViewerComponent = mod.default
    })
  }
})
```

4. In the template where PDFViewer is rendered (around line 140-160), replace:
```svelte
<PDFViewer {pdfPath} {paperId} />
```
with:
```svelte
{#if activeTab === 'pdf'}
  {#if PDFViewerComponent}
    <svelte:component this={PDFViewerComponent} {pdfPath} {paperId} />
  {:else}
    <div class="loading-placeholder">
      <p>Loading PDF viewer...</p>
    </div>
  {/if}
{/if}
```

5. Add minimal loading styles (or reuse existing spinner):
```css
.loading-placeholder {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  color: var(--text-secondary);
}
```

**Why this works:**
- Dynamic import tells Vite to create a separate chunk for PDFViewer
- $effect hook runs only when activeTab changes, triggering the import
- Conditional rendering prevents blank screen during load
- pdf-init.ts already uses ?url pattern, so pdf.worker loads correctly in the chunk

**Do NOT:**
- Import PDFViewer at module level (defeats dynamic loading)
- Import pdf-init functions at module level (they should lazy-load with PDFViewer)
- Change pdf-init.ts or how pdf.worker is imported

**Test behavior:**
- App loads without rendering PDF tab initially
- Clicking PDF tab triggers PDFViewer import
- Once loaded, PDFViewer renders normally
- Switching tabs away and back reuses the loaded component
  </action>
  <verify>
    <automated>npm test 2>&1 | grep -E "passing|failing" && echo "---" && pnpm build 2>&1 | grep -A 5 "pdf-viewer"</automated>
  </verify>
  <done>
- Static import removed from MainPanel.svelte
- Dynamic loading state added (PDFViewerComponent)
- $effect hook loads component on activeTab === 'pdf'
- Loading fallback UI shown while chunk downloads
- Tests pass (no regressions from component ref change)
- pnpm build output shows pdf-viewer chunk ~1.9 MB
  </done>
</task>

<task type="auto">
  <name>Task 2: Lazy-Load Graph Canvas (Priority 2 — saves 400 KB)</name>
  <files>src/lib/components/layout/MainPanel.svelte</files>
  <action>
Similar to PDF.js lazy-loading, add dynamic loading for GraphCanvas:

**Current code (line 5):**
```
import GraphCanvas from '../graph/GraphCanvas.svelte'
```

**Changes:**
1. Remove static import of GraphCanvas (line 5)
2. Add state for component:
```typescript
let GraphCanvasComponent: any = $state(null)
```

3. Add effect hook to load GraphCanvas on activeTab === 'graph':
```typescript
$effect(() => {
  if (activeTab === 'graph' && !GraphCanvasComponent) {
    import('../graph/GraphCanvas.svelte').then((mod) => {
      GraphCanvasComponent = mod.default
    })
  }
})
```

4. In template (around line 160-180), replace:
```svelte
<GraphCanvas {graphData} {selectedPapers} {selectedNote} {notes} />
```
with:
```svelte
{#if activeTab === 'graph'}
  {#if GraphCanvasComponent}
    <svelte:component this={GraphCanvasComponent} {graphData} {selectedPapers} {selectedNote} {notes} />
  {:else}
    <div class="loading-placeholder">
      <p>Loading graph canvas...</p>
    </div>
  {/if}
{/if}
```

5. The loading-placeholder CSS from Task 1 applies here too.

**Why this works:**
- @xyflow/svelte is a heavy library (400 KB) only needed for graph visualization
- Dynamic import creates separate chunk
- Graph users benefit from other features' faster loading
- CSS and event handlers for graph load with component

**Do NOT:**
- Import GraphCanvas at module level
- Import @xyflow dependencies at module level
- Mix Graph imports with Paper imports

**Test behavior:**
- Graph tab shows loading state initially
- After clicking, @xyflow chunk loads and graph renders
- Navigating away and back reuses loaded component
  </action>
  <verify>
    <automated>npm test 2>&1 | grep -E "passing|failing" && echo "---" && pnpm build 2>&1 | grep "graph-canvas"</automated>
  </verify>
  <done>
- Static GraphCanvas import removed
- Dynamic loading state added (GraphCanvasComponent)
- $effect hook loads on activeTab === 'graph'
- Loading fallback shown while @xyflow chunk downloads
- Tests pass
- pnpm build shows graph-canvas chunk ~400 KB
  </done>
</task>

<task type="auto">
  <name>Task 3: Lazy-Load CodeMirror in Notes Editor (Priority 3 — saves 600 KB)</name>
  <files>src/lib/components/editor/NotesPanel.svelte</files>
  <action>
Lazy-load the NotesEditor component that wraps CodeMirror:

**Current code (likely line 1-5):**
```
import NotesEditor from './NotesEditor.svelte'
```

**Changes:**
1. Remove static NotesEditor import
2. Add state:
```typescript
let NotesEditorComponent: any = $state(null)

onMount(async () => {
  // Load NotesEditor when component mounts
  const mod = await import('./NotesEditor.svelte')
  NotesEditorComponent = mod.default
})
```

3. Or, if you want deferred loading (only when user actually clicks Notes tab):
```typescript
let NotesEditorComponent: any = $state(null)

$effect(() => {
  if (isNotesTabActive && !NotesEditorComponent) {
    import('./NotesEditor.svelte').then((mod) => {
      NotesEditorComponent = mod.default
    })
  }
})
```

4. Replace template rendering:
```svelte
<NotesEditor {noteId} {note} on:update on:delete />
```
with:
```svelte
{#if NotesEditorComponent}
  <svelte:component 
    this={NotesEditorComponent} 
    {noteId} 
    {note} 
    on:update 
    on:delete 
  />
{:else}
  <div class="loading-placeholder">
    <p>Loading notes editor...</p>
  </div>
{/if}
```

5. If using onMount + async pattern, wrap in try/catch:
```typescript
onMount(async () => {
  try {
    const mod = await import('./NotesEditor.svelte')
    NotesEditorComponent = mod.default
  } catch (err) {
    console.error('Failed to load NotesEditor:', err)
  }
})
```

**Why this works:**
- NotesEditor imports CodeMirror, which is 600 KB
- If Notes tab is optional or opened later, defer loading
- Conditional rendering provides feedback during load

**Do NOT:**
- Import NotesEditor at module level
- Import CodeMirror directly in NotesPanel
- Render NotesEditor without checking if component loaded

**Test behavior:**
- NotesPanel loads quickly without CodeMirror upfront
- Opening Notes tab (or onMount) triggers NotesEditor import
- CodeMirror loads, editor becomes interactive
- Can type in editor normally after loading
  </action>
  <verify>
    <automated>npm test 2>&1 | grep -E "passing|failing" && echo "---" && pnpm build 2>&1 | grep "code-editor"</automated>
  </verify>
  <done>
- Static NotesEditor import removed
- Dynamic loading state added
- Component loads either on mount or tab activation
- Loading fallback UI shown
- Event forwarding works (on:update, on:delete)
- Tests pass
- pnpm build shows code-editor chunk ~600 KB
  </done>
</task>

<task type="auto">
  <name>Task 4: Lazy-Load Export Utilities (Priority 4 — saves 300 KB)</name>
  <files>src/lib/components/editor/ExportDialog.svelte, src/lib/services/notes-export.ts</files>
  <action>
Lazy-load export service functions (jsPDF, html2canvas, docx) on button click:

**In ExportDialog.svelte:**

1. Identify static imports of export functions (likely top of file):
```typescript
import { exportNotesToPDF, exportNotesToDOCX } from '../../services/notes-export'
```

2. Remove or comment out these imports

3. Replace export function calls with dynamic imports. For example, if there's a handleExportPDF function:
```typescript
// Before:
async function handleExportPDF() {
  const blob = await exportNotesToPDF(title, authors, note)
  // ...
}

// After:
async function handleExportPDF() {
  try {
    // Dynamic import only when user clicks export
    const { exportNotesToPDF } = await import('../../services/notes-export')
    const blob = await exportNotesToPDF(title, authors, note)
    // ...
  } catch (err) {
    console.error('Failed to load export service:', err)
  }
}
```

4. Same pattern for DOCX export:
```typescript
async function handleExportDOCX() {
  try {
    const { exportNotesToDOCX } = await import('../../services/notes-export')
    const blob = await exportNotesToDOCX(title, authors, note)
    // ...
  } catch (err) {
    console.error('Failed to load export service:', err)
  }
}
```

5. Add button state for loading feedback:
```typescript
let isExporting: boolean = $state(false)

async function handleExportPDF() {
  isExporting = true
  try {
    const { exportNotesToPDF } = await import('../../services/notes-export')
    const blob = await exportNotesToPDF(...)
    // download logic
  } finally {
    isExporting = false
  }
}
```

6. Update export button to show loading state:
```svelte
<button 
  disabled={isExporting}
  on:click={handleExportPDF}
>
  {isExporting ? 'Exporting...' : 'Export PDF'}
</button>
```

**In notes-export.ts (no changes needed):**
- Keep all export functions as-is
- They'll be imported dynamically by ExportDialog
- No module-level bundling of jsPDF, html2canvas, docx

**Why this works:**
- Export libraries (jsPDF, html2canvas, docx) only load when user clicks export
- 300 KB saving for users who never export
- Error handling for failed imports
- Loading feedback prevents double-clicks

**Do NOT:**
- Import jsPDF, html2canvas, docx at module level
- Import notes-export at module level (defeats lazy loading)
- Forget to add disabled state to prevent multiple clicks during loading

**Test behavior:**
- ExportDialog opens quickly without export libraries
- Clicking "Export PDF" triggers import of export service
- Service loads (might take ~100ms first time)
- Export proceeds normally
- Second export uses already-loaded service
  </action>
  <verify>
    <automated>npm test 2>&1 | grep -E "passing|failing" && echo "---" && pnpm build 2>&1 | grep "export-utils"</automated>
  </verify>
  <done>
- Static imports of exportNotesToPDF and exportNotesToDOCX removed
- Dynamic imports added in handler functions
- Loading state prevents duplicate clicks
- User sees "Exporting..." feedback while chunk loads
- Export functionality works end-to-end
- Tests pass
- pnpm build shows export-utils chunk ~300 KB
  </done>
</task>

<task type="auto">
  <name>Task 5: Configure Vite Manual Chunks & Optimize Dependencies</name>
  <files>vite.config.ts</files>
  <action>
Update Vite 6.0 configuration to create manual chunks and exclude lazy-loaded libraries from pre-bundling:

**Replace current vite.config.ts with updated version:**

```typescript
import { defineConfig } from 'vite'
import { svelte } from '@sveltejs/vite-plugin-svelte'

// @ts-expect-error process is a nodejs global
const host = process.env.TAURI_DEV_HOST

// https://vite.dev/config/
export default defineConfig({
  plugins: [svelte()],

  // Vite options tailored for Tauri development and only applied in `tauri dev` or `tauri build`
  clearScreen: false,
  server: {
    port: 1420,
    strictPort: true,
    host: host || false,
    hmr: host
      ? {
          protocol: 'ws',
          host,
          port: 1421,
        }
      : undefined,
    watch: {
      ignored: ['**/src-tauri/**'],
    },
  },

  build: {
    target: 'esnext',
    minify: 'esbuild',
    cssCodeSplit: true,
    rollupOptions: {
      output: {
        manualChunks(id) {
          // PDF.js chunk (lazy-loaded, ~1.9MB)
          if (id.includes('pdfjs-dist')) {
            return 'pdf-viewer'
          }

          // CodeMirror chunk (lazy-loaded, ~600KB)
          if (id.includes('codemirror') || id.includes('@codemirror')) {
            return 'code-editor'
          }

          // Graph visualization chunk (lazy-loaded, ~400KB)
          if (id.includes('@xyflow')) {
            return 'graph-canvas'
          }

          // Export utilities chunk (lazy-loaded, ~300KB)
          if (id.includes('jspdf') || id.includes('html2canvas') || id.includes('docx')) {
            return 'export-utils'
          }

          // Vendor chunk for shared dependencies
          if (id.includes('node_modules/') && !id.includes('tauri')) {
            return 'vendor'
          }
        },
      },
    },
  },

  optimizeDeps: {
    include: ['@tauri-apps/api', '@tauri-apps/plugin-store', '@tauri-apps/plugin-dialog'],
    // Exclude lazy-loaded libraries from pre-bundling
    // This prevents them from being bundled into the main chunk during dev
    exclude: ['pdfjs-dist', 'codemirror', '@xyflow/svelte', 'jspdf', 'html2canvas', 'docx'],
  },
})
```

**Key changes:**
1. Added `rollupOptions.output.manualChunks()` function that groups:
   - pdfjs-dist → 'pdf-viewer' chunk
   - codemirror → 'code-editor' chunk
   - @xyflow → 'graph-canvas' chunk
   - jspdf, html2canvas, docx → 'export-utils' chunk
   - Other node_modules → 'vendor' chunk

2. Updated `optimizeDeps.exclude` array to prevent pre-bundling of lazy libraries:
   - pdfjs-dist
   - codemirror
   - @xyflow/svelte
   - jspdf
   - html2canvas
   - docx

**Why this works:**
- manualChunks tells Rollup to create separate output files for each chunk
- exclude list prevents Vite from pre-bundling these libs during dev
- Result: Each lazy-loaded feature gets its own bundle file
- Browser caches each chunk independently (better cache reuse on updates)

**Do NOT:**
- Add Svelte components to manualChunks (Vite handles them automatically)
- Remove @tauri-apps from conditions (Tauri APIs stay in main chunk)
- Exclude libraries you want in main bundle

**Verification after build:**
- Run `pnpm build`
- Check dist/js/ directory for new chunks:
  - `pdf-viewer-[hash].js` (~1.9 MB)
  - `code-editor-[hash].js` (~600 KB)
  - `graph-canvas-[hash].js` (~400 KB)
  - `export-utils-[hash].js` (~300 KB)
  - `vendor-[hash].js` (~200 KB)
  - `main-[hash].js` (~2.1 MB, down from 5.3 MB)
  </action>
  <verify>
    <automated>pnpm build 2>&1 | tail -30</automated>
  </verify>
  <done>
- rollupOptions.output.manualChunks() function added with all 5 chunk groups
- optimizeDeps.exclude array updated to exclude lazy-loaded libraries
- vite.config.ts saved and formatted correctly
- pnpm build creates separate chunks for pdf-viewer, code-editor, graph-canvas, export-utils
- Main chunk reduced from 5.3 MB to ~2.1 MB
- No build errors or warnings (only expected chunk splitting messages)
  </done>
</task>

<task type="auto">
  <name>Task 6: Verify Bundle Size & Test All Features</name>
  <files></files>
  <action>
Run comprehensive verification to ensure bundle optimization is complete and no regressions:

**Step 1: Clean build and inspect bundle**
```bash
rm -rf dist/
pnpm build
```

Inspect output for:
- Main chunk: < 2.5 MB (target: ~2.1 MB)
- pdf-viewer chunk: ~1.9 MB
- code-editor chunk: ~600 KB
- graph-canvas chunk: ~400 KB
- export-utils chunk: ~300 KB
- vendor chunk: ~200 KB
- Total size: ~6.2 MB (vs original 5.3 MB in main, distributed across chunks)

Expected output format:
```
dist/js/main-[hash].js        210 kB
dist/js/pdf-viewer-[hash].js   1.9 MB
dist/js/code-editor-[hash].js  600 kB
dist/js/graph-canvas-[hash].js 400 kB
dist/js/export-utils-[hash].js 300 kB
dist/js/vendor-[hash].js       200 kB
```

**Step 2: Run test suite**
```bash
npm test
```

All 41 tests must pass with zero regressions. Expected output:
```
✓ 41 tests passing
0 failures
```

**Step 3: Start dev server and test manually**
```bash
pnpm dev
```

Then test in app:
1. **Startup:** App loads quickly (should feel noticeably faster)
2. **Chat tab:** Works immediately (no lazy-loaded deps)
3. **Papers tab:** Works immediately (search, list loading)
4. **PDF tab:** Shows loading spinner, then loads PDF normally
   - Click PDF tab
   - Observe "Loading PDF viewer..." briefly
   - PDF loads and renders
5. **Notes tab:** Shows loading spinner, then editor available
   - Click Notes tab
   - Observe "Loading notes editor..." briefly
   - CodeMirror editor loads
   - Can type in editor normally
6. **Graph tab:** Shows loading spinner, then graph renders
   - Click Graph tab
   - Observe "Loading graph canvas..." briefly
   - Graph loads with @xyflow
7. **Export:** Button shows loading state
   - Open Notes export dialog
   - Click "Export PDF"
   - Observe "Exporting..." state
   - Dialog closes with success

**Step 4: Browser DevTools verification**
```
- Open DevTools → Network tab
- Reload page
- Verify only main chunk loads at startup
- Click PDF tab
- Verify pdf-viewer-[hash].js loads
- Repeat for other tabs
- Verify chunks only load once (cached on subsequent clicks)
```

**Step 5: Performance check (optional)**
```bash
# Run Lighthouse audit (manual in DevTools)
# Expected improvements:
# - FCP (First Contentful Paint): ~12s (was ~30s on 3G)
# - TTI (Time to Interactive): ~5.6s (was ~14s on 3G)
# - Main thread time: Reduced significantly
```

**Step 6: Cache validation**
Update a lazy-loaded component (e.g., add a console.log in PDFViewer.svelte):
```bash
pnpm build
```

Verify:
- Only pdf-viewer chunk hash changes
- All other chunks have same hash (cache-friendly)
- main chunk might have different hash if imports changed

**Expected behavior:** After all verifications:
- Bundle loads 60% faster initially
- Lazy features load transparently on demand
- No blank screens (fallback UI shown)
- All features work exactly as before
- Zero test failures
  </action>
  <verify>
    <automated>npm test 2>&1 | tail -5 && echo "---" && pnpm build 2>&1 | grep -E "js/|kB|MB" | tail -10</automated>
  </verify>
  <done>
- pnpm build completes without errors
- Main chunk < 2.5 MB (confirmed in build output)
- 5 lazy-loaded chunks created with correct sizes:
  - pdf-viewer ~1.9 MB
  - code-editor ~600 KB
  - graph-canvas ~400 KB
  - export-utils ~300 KB
  - vendor ~200 KB
- npm test passes with 41/41 tests green, zero failures
- Manual testing confirms:
  - PDF, Notes, Graph, Export load on-demand with loading fallback
  - All features work end-to-end
  - No blank screens or errors
- Bundle size reduction verified (60% improvement from 5.3 MB)
  </done>
</task>

<task type="checkpoint:human-verify" gate="blocking">
  <what-built>
Complete code-splitting implementation for Phase 7 Wave 3:
- Dynamic PDF.js lazy-loading (1.9 MB saved)
- Dynamic CodeMirror lazy-loading (600 KB saved)
- Dynamic @xyflow lazy-loading (400 KB saved)
- Dynamic export utilities lazy-loading (300 KB saved)
- Vite manual chunks configuration
- All 41 tests passing
  </what-built>
  <how-to-verify>
1. **Start dev server:** `pnpm dev`
2. **Check startup performance:**
   - App should load much faster (feel responsiveness immediately)
   - No PDF, CodeMirror, @xyflow, or export libs loading at startup
   - Compare with previous startup time (14s → target 5.6s on 3G)

3. **Verify lazy-loading for each feature:**
   - **PDF Tab:** Click PDF tab → observe "Loading PDF viewer..." briefly → PDF renders normally
   - **Notes Tab:** Click Notes tab → observe "Loading notes editor..." briefly → Editor ready to type
   - **Graph Tab:** Click Graph tab → observe "Loading graph canvas..." briefly → Graph displays normally
   - **Export:** Open export dialog → click "Export PDF" → observe "Exporting..." state → Export completes

4. **DevTools Network Tab verification:**
   - Reload app in DevTools Network tab (disable cache if needed)
   - Verify ONLY main chunk loads at startup
   - Click each tab and verify corresponding chunk loads:
     - pdf-viewer-[hash].js (1.9 MB) on PDF tab click
     - code-editor-[hash].js (600 KB) on Notes tab click
     - graph-canvas-[hash].js (400 KB) on Graph tab click
   - Click export and verify export-utils chunk loads

5. **Run test suite:**
   ```bash
   npm test
   ```
   - Confirm: ✓ 41 tests passing
   - No failures or regressions

6. **Build verification:**
   ```bash
   pnpm build
   ```
   - Check dist/js/ directory for all chunks
   - Confirm main chunk ~2.1 MB (was 5.3 MB)
   - Confirm separate chunks exist for pdf-viewer, code-editor, graph-canvas, export-utils

7. **Feature completeness check:**
   - Chat works (no dependencies changed)
   - Search works (no dependencies changed)
   - PDF viewing works with dynamic loading
   - Notes editing works with dynamic loading
   - Graph visualization works with dynamic loading
   - Export functionality works with dynamic loading
   - No console errors

8. **Performance perception:**
   - App feels noticeably faster to load
   - First interaction (chat/search) available sooner
   - Lazy features load transparently in background
  </how-to-verify>
  <resume-signal>
Type "approved" if all verifications pass, or describe any issues (e.g., "Graph chunk not loading", "Tests fail", "Build error in code-editor chunk")
  </resume-signal>
</task>

</tasks>

<verification>
**Phase 7 Wave 3 Completion Checklist:**

- [ ] Task 1: MainPanel.svelte dynamically loads PDFViewer on activeTab === 'pdf'
- [ ] Task 2: MainPanel.svelte dynamically loads GraphCanvas on activeTab === 'graph'
- [ ] Task 3: NotesPanel.svelte dynamically loads NotesEditor (CodeMirror)
- [ ] Task 4: ExportDialog.svelte dynamically imports export service on button click
- [ ] Task 5: vite.config.ts has rollupOptions.manualChunks() grouping all 5 chunk types
- [ ] Task 5: optimizeDeps.exclude includes all lazy-loaded libraries
- [ ] Task 6: pnpm build creates 6 chunks with correct sizes
- [ ] Task 6: npm test passes with 41/41 tests green
- [ ] Task 6: Manual testing confirms lazy-loading with fallback UI
- [ ] Checkpoint: All features work end-to-end with 60% bundle reduction
</verification>

<success_criteria>
Wave 3 is complete when:

✅ **Bundle Size Targets Met:**
- Main chunk: < 2.5 MB (currently 5.3 MB, target ~2.1 MB)
- pdf-viewer chunk: ~1.9 MB (lazy-loaded)
- code-editor chunk: ~600 KB (lazy-loaded)
- graph-canvas chunk: ~400 KB (lazy-loaded)
- export-utils chunk: ~300 KB (lazy-loaded)
- **Total reduction: 60% from 5.3 MB to distributed chunks**

✅ **Performance Improvement:**
- App startup 60% faster (14s → 5.6s on 3G)
- Main bundle 60% smaller (5.3 MB → 2.1 MB)
- Time to interactive significantly improved
- No startup blocking from optional features

✅ **Lazy-Loading Verification:**
- PDF.js loads only when PDF tab clicked
- CodeMirror loads only when Notes tab opened
- @xyflow loads only when Graph tab clicked
- Export utilities load only on export button click
- Loading fallback UI shown during chunk load
- No blank screens

✅ **Test Coverage:**
- All 41 tests pass (zero regressions)
- No console errors
- Feature-specific tests confirm lazy-loading behavior

✅ **Code Quality:**
- No custom solutions used (native Vite 6.0 + Svelte 5)
- All patterns match research recommendations
- pdf-init.ts unchanged (already optimal)
- Fully reversible if issues arise (< 5 min rollback)

✅ **Browser Compatibility:**
- Dynamic imports supported on Chrome 63+, Safari 11.1+ (Tauri default targets)
- No polyfills needed
- Tauri webview compatibility verified
</success_criteria>

<output>
After successful completion, create summary in:
`.planning/phases/phase-7/07-wave3-bundle-optimization-SUMMARY.md`

Summary should include:
- Bundle size reduction metrics (before/after)
- Chunks created and their sizes
- Performance improvement (startup time reduction)
- Feature lazy-loading verification
- Test results (41/41 passing)
- Implementation time tracking
- Any deviations or notes from research
</output>
