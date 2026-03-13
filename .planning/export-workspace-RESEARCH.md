# Research Workspace Export — Export Format & Strategy

**Researched:** March 2025  
**Domain:** Document export, archiving, search indexing  
**Confidence:** HIGH (verified against package.json dependencies + library documentation)

## Summary

Anya-RA needs to export research workspaces as shareable archives with papers, notes, graph visualization, and searchable metadata. This research evaluates four format approaches and recommends **ZIP archive as primary format** with optional single-HTML variant.

**Key findings:**
- **ZIP format** (via JSZip 3.10.1) is standard, mature, and production-ready
- **Metadata.json** enables true portability and workspace re-import
- **lunr.js** (2.3.9) provides efficient client-side full-text search
- Current codebase already has marked (17.0.4) for markdown rendering and html2canvas (1.4.1) for visualizations
- File size management critical: make PDF inclusion optional (default OFF)

**Primary recommendation:** Implement ZIP-based export with modular structure (index.html + papers/ + assets/ + metadata.json) supporting full-text search, graph visualization snapshots, and metadata-driven re-import.

---

## Standard Stack

### Core Export Infrastructure
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| JSZip | 3.10.1 | ZIP archive creation | Pure JS, browser-compatible, proven standard for document bundles |
| marked | 17.0.4 | Markdown → HTML conversion | Already in project, handles edge cases, active maintenance |
| html2canvas | 1.4.1 | Canvas/DOM → PNG snapshot | Already in project, used for graph visualization export |
| lunr.js | 2.3.9 | Full-text search indexing | Lightweight (~60KB), offline-capable, no server required |

### Supporting Libraries
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| docx | 9.6.1 | DOCX generation | Single-paper exports (already used in ExportDialog) |
| jsPDF | 4.2.0 | PDF generation | Single-paper PDF exports (already used) |
| epub | 2.1.1 | EPUB generation | Optional: for ereader distribution (Wave 3+) |

### Installation
```bash
# Core export dependencies (add to package.json)
pnpm add jszip lunr
pnpm add --save-dev @types/lunr

# JSZip is pure JS, no build-specific config needed
# Already have: marked, html2canvas, docx, jsPDF
```

---

## Architecture Patterns

### Recommended Export Structure

```
export-workspace-YYYY-MM-DD.zip
├── index.html                          # Navigation hub + search UI
├── metadata.json                       # Complete data schema (for re-import)
├── papers/
│   ├── arxiv_2024-001.html            # Single paper with notes
│   ├── arxiv_2024-002.html
│   └── ... (one per paper)
├── assets/
│   ├── styles.css                     # Shared stylesheet
│   ├── search.js                      # lunr.js + search UI logic
│   ├── graph-snapshot.svg             # Knowledge graph visualization
│   └── logo.svg                       # Optional branding
└── pdfs/                              # Optional: include actual PDFs
    ├── arxiv_2024-001.pdf
    └── ...
```

**Rationale:**
- Modular structure allows selective unzipping
- metadata.json enables full workspace reconstruction
- Separate assets reduce duplication
- papers/ folder stays flat for easy navigation

### Pattern 1: ZIP Generation Service

**What:** Central service orchestrating archive creation

**When to use:** Any export operation (single paper, tagged subset, full workspace)

**Example:**
```typescript
// src/lib/services/workspace-export.ts
import JSZip from 'jszip'
import type { Paper, Note } from '../types'
import type { GraphFile } from '../types/graph'

export interface ExportOptions {
  includePDFs: boolean
  includeAnnotations: boolean
  includeGraph: boolean
}

export async function createWorkspaceZip(
  papers: Paper[],
  notes: Note[],
  graphData: GraphFile,
  options: ExportOptions,
  onProgress?: (current: number, total: number) => void
): Promise<Blob> {
  const zip = new JSZip()
  const total = papers.length
  
  // 1. Add metadata.json (constant time)
  const metadata = buildExportMetadata(papers, notes, graphData)
  zip.file('metadata.json', JSON.stringify(metadata, null, 2))
  
  // 2. Add papers folder with individual HTML files
  const papersFolder = zip.folder('papers')!
  for (let i = 0; i < papers.length; i++) {
    const paper = papers[i]
    const paperNotes = notes.filter(n => n.paperId === paper.id)
    const html = await generatePaperHTML(paper, paperNotes)
    papersFolder.file(`${paper.id}.html`, html)
    
    onProgress?.(i + 1, total)
    // Yield to prevent UI blocking
    await new Promise(resolve => setTimeout(resolve, 0))
  }
  
  // 3. Add assets folder (CSS, JS, images)
  const assetsFolder = zip.folder('assets')!
  assetsFolder.file('styles.css', SHARED_STYLES)
  assetsFolder.file('search.js', buildSearchScript(papers, notes))
  
  if (options.includeGraph) {
    const graphSnapshot = await captureGraphSnapshot()
    assetsFolder.file('graph-snapshot.svg', graphSnapshot)
  }
  
  // 4. Add PDFs if requested
  if (options.includePDFs) {
    const pdfsFolder = zip.folder('pdfs')!
    for (const paper of papers) {
      if (paper.localPdfPath) {
        const pdfBlob = await readPdfFromDisk(paper.localPdfPath)
        pdfsFolder.file(`${paper.id}.pdf`, pdfBlob)
      }
    }
  }
  
  // 5. Generate final ZIP
  return await zip.generateAsync({
    type: 'blob',
    compression: 'DEFLATE',
    compressionOptions: { level: 9 }
  })
}
```

### Pattern 2: Search Index Generation

**What:** Build lunr.js index from papers + notes + annotations

**When to use:** During export generation, embedded in index.html

**Example:**
```typescript
// src/lib/services/search-index.ts
import lunr, { type Index } from 'lunr'
import type { Paper, Note } from '../types'

export function createSearchIndex(
  papers: Paper[],
  notes: Map<string, Note[]>
): Index {
  return lunr(function() {
    // Configure fields with relevance boosting
    this.field('title', { boost: 10 })
    this.field('authors', { boost: 5 })
    this.field('abstract', { boost: 3 })
    this.field('tags', { boost: 8 })
    this.field('notes') // Lower boost for note content
    
    // Index all papers with their associated notes
    papers.forEach(paper => {
      const paperNotes = notes.get(paper.id) || []
      const noteContent = paperNotes.map(n => n.content).join(' ')
      
      this.add({
        id: paper.id,
        title: paper.title,
        authors: paper.authors.join(' '),
        abstract: paper.abstract || '',
        tags: (paper.tags || []).join(' '),
        notes: noteContent
      })
    })
  })
}

export function serializeIndex(idx: Index): string {
  // Convert index to JSON for embedding in HTML
  return JSON.stringify(idx.toJSON())
}
```

### Pattern 3: Paper HTML Generation

**What:** Convert paper metadata + notes into standalone HTML

**When to use:** For each paper during export, or single-paper share

**Example:**
```typescript
// src/lib/services/paper-html.ts
import { marked } from 'marked'
import type { Paper, Note } from '../types'

export async function generatePaperHTML(
  paper: Paper,
  notes: Note[]
): Promise<string> {
  // Render notes markdown to HTML
  const notesHTML = await Promise.all(
    notes.map(n => marked(n.content))
  )
  
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="description" content="${escapeHTML(paper.abstract || '')}">
  <title>${escapeHTML(paper.title)}</title>
  <link rel="stylesheet" href="../assets/styles.css">
</head>
<body>
  <article>
    <header>
      <h1>${escapeHTML(paper.title)}</h1>
      <p class="authors">${escapeHTML(paper.authors.join(', '))}</p>
      <p class="metadata">
        ${paper.year ? `<span class="year">${paper.year}</span>` : ''}
        ${paper.doi ? `<a href="https://doi.org/${paper.doi}">DOI</a>` : ''}
        ${paper.arxivId ? `<a href="https://arxiv.org/abs/${paper.arxivId}">arXiv</a>` : ''}
      </p>
      ${paper.tags.length > 0 ? `
        <div class="tags">
          ${paper.tags.map(t => `<span class="tag">${escapeHTML(t)}</span>`).join('')}
        </div>
      ` : ''}
    </header>
    
    ${paper.abstract ? `
      <section class="abstract">
        <h2>Abstract</h2>
        <p>${escapeHTML(paper.abstract)}</p>
      </section>
    ` : ''}
    
    ${notesHTML.length > 0 ? `
      <section class="notes">
        <h2>Research Notes</h2>
        <div class="note-content">
          ${notesHTML.join('<hr class="note-divider">')}
        </div>
      </section>
    ` : ''}
    
    <footer>
      <p>Exported from Anya Research Workspace • ${new Date().toISOString().split('T')[0]}</p>
      <p><a href="../index.html">← Back to workspace</a></p>
    </footer>
  </article>
</body>
</html>`
}

function escapeHTML(text: string): string {
  const div = document.createElement('div')
  div.textContent = text
  return div.innerHTML
}
```

### Pattern 4: Index HTML with Embedded Search

**What:** Main entry point with search UI powered by lunr.js

**When to use:** Generated once during export, entry point for viewing

**Example:**
```typescript
// src/lib/services/index-html.ts
export function generateIndexHTML(
  papers: Paper[],
  searchIndexJSON: string
): string {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Research Workspace Export</title>
  <script src="https://cdn.jsdelivr.net/npm/lunr@2"></script>
  <link rel="stylesheet" href="assets/styles.css">
</head>
<body>
  <header>
    <h1>📚 Research Workspace</h1>
    <p class="count">${papers.length} papers</p>
  </header>
  
  <div id="search-container">
    <input 
      type="search" 
      id="searchBox" 
      placeholder="Search papers, notes, authors..."
      autocomplete="off"
    >
  </div>
  
  <div id="results"></div>
  
  <script>
    // Embedded search index (serialized lunr index)
    const indexData = ${searchIndexJSON}
    const idx = lunr.Index.load(indexData)
    
    // Paper metadata for results display
    const papers = ${JSON.stringify(papers)}
    
    const searchBox = document.getElementById('searchBox')
    const resultsDiv = document.getElementById('results')
    
    // Initialize with all papers
    displayAllPapers()
    
    searchBox.addEventListener('input', (e) => {
      const query = e.target.value.trim()
      if (!query) {
        displayAllPapers()
        return
      }
      
      // Full-text search
      const results = idx.search(query)
      displayResults(results)
    })
    
    function displayAllPapers() {
      resultsDiv.innerHTML = papers.map(p => makePaperCard(p)).join('')
    }
    
    function displayResults(results) {
      if (results.length === 0) {
        resultsDiv.innerHTML = '<p class="no-results">No papers found</p>'
        return
      }
      
      resultsDiv.innerHTML = results.map(r => {
        const paper = papers.find(p => p.id === r.ref)
        return makePaperCard(paper, r.score)
      }).join('')
    }
    
    function makePaperCard(paper, score) {
      return \`<a href="papers/\${paper.id}.html" class="paper-card">
        <h3>\${paper.title}</h3>
        <p class="authors">\${paper.authors.join(', ')}</p>
        <p class="abstract">\${paper.abstract?.substring(0, 200) || 'No abstract'}...</p>
        <div class="meta">
          <span class="year">\${paper.year || 'Unknown year'}</span>
          <span class="tags">\${(paper.tags || []).join(', ')}</span>
        </div>
        \${score ? \`<p class="score">Match: \${Math.round(score * 100) / 100}</p>\` : ''}
      </a>\`
    }
  </script>
</body>
</html>`
}
```

### Pattern 5: Graph Visualization Export

**What:** Capture knowledge graph as PNG or SVG snapshot

**When to use:** Include static graph image in export (optional feature)

**Example — Canvas Screenshot:**
```typescript
// Simplest: HTML5 canvas -> PNG
export async function exportGraphSnapshot(
  canvasElement: HTMLCanvasElement
): Promise<Blob> {
  return new Promise(resolve => {
    canvasElement.toBlob(blob => {
      resolve(blob || new Blob())
    }, 'image/png', 0.95)
  })
}
```

**Example — SVG Rendering (Advanced):**
```typescript
// For scalable graph export
export function renderGraphSVG(graphData: GraphFile): string {
  const { nodes, edges } = graphData
  
  return `<svg viewBox="0 0 1000 800" xmlns="http://www.w3.org/2000/svg">
    <!-- Edges first (background) -->
    ${edges.map(e => `
      <line
        x1="${nodes.find(n => n.id === e.source)?.position.x || 0}"
        y1="${nodes.find(n => n.id === e.source)?.position.y || 0}"
        x2="${nodes.find(n => n.id === e.target)?.position.x || 0}"
        y2="${nodes.find(n => n.id === e.target)?.position.y || 0}"
        stroke="#999" stroke-width="1"
      />
    `).join('')}
    
    <!-- Nodes -->
    ${nodes.map(n => `
      <circle cx="${n.position.x}" cy="${n.position.y}" r="30" fill="${n.data.color || '#4da6ff'}" />
      <text x="${n.position.x}" y="${n.position.y}" text-anchor="middle">
        ${(n.data as any).title?.substring(0, 20) || 'Node'}
      </text>
    `).join('')}
  </svg>`
}
```

### Anti-Patterns to Avoid

- **Don't:** Build custom ZIP binary format — use JSZip, it's proven
- **Don't:** String concatenate HTML — use template literals with escapeHTML()
- **Don't:** Parse markdown with regex — marked() handles all edge cases
- **Don't:** Implement custom search — lunr.js is industry standard
- **Don't:** Assume papers fit in memory — use generateAsync() and progress reporting
- **Don't:** Embed full PDFs in single-HTML — ZIP with selective PDF inclusion instead

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| ZIP creation | Custom binary format | JSZip | Proven, widely compatible, handles compression |
| HTML sanitization | Manual string escaping | `div.textContent` then `div.innerHTML` | Prevents XSS vulnerabilities |
| Markdown parsing | Regex patterns | marked | Handles nested lists, code blocks, tables correctly |
| Full-text search | Simple substring matching | lunr.js | Ranking, stemming, phrase search, field boosting |
| Archive validation | Manual ZIP file reading | JSZip.load() + validate() | Detects corrupted archives properly |
| Base64 encoding of large files | Native atob/btoa | Binary blob operations | Prevents 33% size bloat and memory issues |

**Key insight:** Export functionality is domain-heavy — file format standards (ZIP, HTML5, JSON), text processing (markdown, HTML), and information retrieval (search indexing) have been solved by mature libraries. Focus implementation on workflow (UI, options, progress) rather than format details.

---

## Common Pitfalls

### Pitfall 1: Base64 Encoding Bloat
**What goes wrong:** Including PDF as base64 in single-HTML increases file size by ~33%  
**Why it happens:** Base64 encodes every 3 bytes as 4 characters (4/3 overhead)  
**How to avoid:**
- Make PDF inclusion optional (toggle in export dialog)
- Default to OFF — most users don't need PDFs in shared archives
- Store PDFs in ZIP folder separately (remains compressed)

**Warning signs:**
- Export file > 100MB for modest workspaces (50-100 papers)
- Browser tab becomes unresponsive during generation
- User feedback: "exported file is huge"

### Pitfall 2: Circular References in Graph JSON
**What goes wrong:** Edges reference source/target node IDs, causing infinite recursion if not careful  
**Why it happens:** Temptation to embed full node objects in edges for convenience  
**How to avoid:**
- Export edges as `{ id, source, target, data }` only (ID references)
- Validate during export: every source/target must match a node ID
- Document schema: edges don't contain full node objects

**Warning signs:**
- JSON serialization throws "Converting circular structure" error
- Graph JSON file is suspiciously large (multiple copies of nodes)
- Re-import fails when reconstructing graph

### Pitfall 3: Window Path Separators in ZIP Paths
**What goes wrong:** Windows uses `\` in paths, but ZIP standard requires `/`  
**Why it happens:** String interpolation of file paths: `papers\arxiv_123.html`  
**How to avoid:**
- Always use `/` when calling `zip.file()` or `zip.folder()`
- JSZip handles this automatically — but be explicit
- Don't use `path.join()` for ZIP paths

**Warning signs:**
- ZIP works on macOS/Linux but fails on Windows
- File paths look wrong when inspecting ZIP contents
- Archive extraction creates unexpected directory structures

### Pitfall 4: Search Index Staleness
**What goes wrong:** User updates notes after export, but search still finds old content  
**Why it happens:** Search index is built once at export time and frozen  
**How to avoid:**
- Include `exportedAt` timestamp in metadata.json and UI
- Clearly communicate: "Search reflects workspace as of [date]"
- Document that re-export creates fresh index
- (Optional Wave 4) Add incremental re-indexing on import

**Warning signs:**
- User searches and finds old note content that no longer exists
- User confusion: "I changed this note but search still shows the old version"
- Feature request: "update search index"

### Pitfall 5: Large Export Blocks UI Thread
**What goes wrong:** Generating ZIP for 500+ papers freezes app for 30+ seconds  
**Why it happens:** Single-threaded JavaScript processing all files sequentially  
**How to avoid:**
- Use async/await with progress callbacks
- Yield to event loop: `await new Promise(r => setTimeout(r, 0))`
- Show progress bar with estimated time
- (Advanced) Offload to Web Worker for massive exports

**Warning signs:**
- User clicks export and app becomes unresponsive
- Progress bar is missing or updates in batches
- "export is slow" performance complaints
- Browser warns about unresponsive script

---

## Metadata Schema for Re-Import

**Location:** `metadata.json` in exported ZIP

**Purpose:** Enable workspace reconstruction without access to original PDFs or app state

**Schema:**
```typescript
export interface ExportMetadata {
  version: '1.0'
  workspace: {
    name: string
    createdAt: string        // ISO 8601
    exportedAt: string       // ISO 8601
  }
  papers: Array<{
    id: string               // Local ID: {source}_{externalId}
    source: 'arxiv' | 'semantic_scholar' | 'local'
    externalId: string
    title: string
    authors: string[]
    year: number | null
    abstract: string | null
    url: string
    doi: string | null
    arxivId: string | null
    semanticId: string | null
    tags: string[]
    pdfIncluded: boolean     // True if PDF exists in pdfs/ folder
    importedAt: string       // ISO 8601
  }>
  notes: Array<{
    paperId: string
    content: string          // Markdown source
    createdAt: string        // ISO 8601
    updatedAt: string        // ISO 8601
  }>
  graph: {
    nodes: PersistedNode[]
    edges: PersistedEdge[]
    viewport: { x: number; y: number; zoom: number }
  }
  annotations?: Array<{
    paperId: string
    page: number
    content: string
    type: 'highlight' | 'note' | 'bookmark'
    createdAt: string        // ISO 8601
  }>
}
```

**Validation on import:**
```typescript
export function validateExportMetadata(data: unknown): data is ExportMetadata {
  if (typeof data !== 'object' || data === null) return false
  const m = data as any
  return (
    m.version === '1.0' &&
    typeof m.workspace?.name === 'string' &&
    Array.isArray(m.papers) &&
    Array.isArray(m.notes) &&
    m.papers.every((p: any) => typeof p.id === 'string' && typeof p.title === 'string') &&
    m.notes.every((n: any) => typeof n.paperId === 'string' && typeof n.content === 'string')
  )
}
```

**Schema versioning:**
- Always include `version` field
- Current: `1.0` (March 2025)
- Future migrations: `loadMetadataV1()` → migrate to v2 schema
- This prevents breaking changes across app versions

---

## Code Examples

### Example 1: Workspace Export Service
```typescript
// src/lib/services/workspace-export.ts
import JSZip from 'jszip'
import { marked } from 'marked'
import { createSearchIndex, serializeIndex } from './search-index'
import type { Paper, Note } from '../types'
import type { GraphFile } from '../types/graph'

export interface ExportOptions {
  includePDFs: boolean
  includeAnnotations: boolean
  includeGraph: boolean
}

export async function exportWorkspace(
  papers: Paper[],
  notes: Note[],
  graphData: GraphFile,
  options: ExportOptions,
  onProgress?: (current: number, total: number) => void
): Promise<Blob> {
  const zip = new JSZip()
  
  // Step 1: Metadata
  const metadata = {
    version: '1.0',
    workspace: { name: 'Research Workspace', exportedAt: new Date().toISOString() },
    papers: papers.map(p => ({
      id: p.id, title: p.title, authors: p.authors, year: p.year,
      abstract: p.abstract, tags: p.tags, pdfIncluded: options.includePDFs && !!p.localPdfPath
    })),
    notes: notes.map(n => ({ paperId: n.paperId, content: n.content })),
    graph: options.includeGraph ? graphData : { nodes: [], edges: [], viewport: { x: 0, y: 0, zoom: 1 } }
  }
  zip.file('metadata.json', JSON.stringify(metadata, null, 2))
  
  // Step 2: Papers HTML
  const papersFolder = zip.folder('papers')!
  for (let i = 0; i < papers.length; i++) {
    const paper = papers[i]
    const paperNotes = notes.filter(n => n.paperId === paper.id)
    const html = await generatePaperHTML(paper, paperNotes)
    papersFolder.file(`${paper.id}.html`, html)
    onProgress?.(i + 1, papers.length)
    await new Promise(r => setTimeout(r, 0))
  }
  
  // Step 3: Search index
  const searchIndex = createSearchIndex(papers, new Map(notes.map(n => [n.paperId, [n]])))
  const assetsFolder = zip.folder('assets')!
  assetsFolder.file('search.js', `const searchIndex = ${serializeIndex(searchIndex)};`)
  
  // Step 4: Generate
  return await zip.generateAsync({ type: 'blob', compression: 'DEFLATE', compressionOptions: { level: 9 } })
}

async function generatePaperHTML(paper: Paper, notes: Note[]): Promise<string> {
  const notesHTML = notes.map(n => `<section><p>${await marked(n.content)}</p></section>`).join('')
  return `<!DOCTYPE html>
<html><head><meta charset="UTF-8"><title>${paper.title}</title></head>
<body><h1>${paper.title}</h1><p>${paper.authors.join(', ')}</p>${notesHTML}</body></html>`
}
```

### Example 2: Search Index Generation
```typescript
// src/lib/services/search-index.ts
import lunr from 'lunr'
import type { Paper, Note } from '../types'

export function createSearchIndex(papers: Paper[], notes: Map<string, Note[]>) {
  return lunr(function() {
    this.field('title', { boost: 10 })
    this.field('authors', { boost: 5 })
    this.field('abstract')
    this.field('tags', { boost: 8 })
    this.field('notes')
    
    papers.forEach(p => {
      const noteText = (notes.get(p.id) || []).map(n => n.content).join(' ')
      this.add({
        id: p.id,
        title: p.title,
        authors: p.authors.join(' '),
        abstract: p.abstract || '',
        tags: p.tags.join(' '),
        notes: noteText
      })
    })
  })
}

export function serializeIndex(idx: lunr.Index): string {
  return JSON.stringify(idx.toJSON())
}
```

### Example 3: Export Dialog (Svelte Component)
```svelte
<!-- src/lib/components/WorkspaceExportDialog.svelte -->
<script lang="ts">
  import { exportWorkspace, type ExportOptions } from '../../services/workspace-export'
  import { downloadFile } from '../../services/notes-export'
  import { papers, notes } from '../../stores'
  
  let scope: 'all' | 'selected' = 'all'
  let includePDFs = false
  let includeAnnotations = true
  let includeGraph = true
  let isExporting = false
  let progress = 0
  
  async function handleExport() {
    isExporting = true
    try {
      const papersList = $papers
      const notesList = $notes
      
      const blob = await exportWorkspace(
        papersList,
        notesList,
        { nodes: [], edges: [], viewport: { x: 0, y: 0, zoom: 1 } },
        { includePDFs, includeAnnotations, includeGraph },
        (current, total) => { progress = (current / total) * 100 }
      )
      
      await downloadFile(blob, `research-export-${new Date().toISOString().split('T')[0]}.zip`)
    } finally {
      isExporting = false
    }
  }
</script>

<div class="modal">
  <h2>Export Workspace</h2>
  
  <fieldset>
    <legend>Options</legend>
    <label><input type="checkbox" bind:checked={includePDFs}> Include PDFs (larger file)</label>
    <label><input type="checkbox" bind:checked={includeAnnotations}> Include annotations</label>
    <label><input type="checkbox" bind:checked={includeGraph}> Include graph visualization</label>
  </fieldset>
  
  {#if isExporting}
    <div class="progress"><div style="width: {progress}%"></div></div>
  {/if}
  
  <div class="actions">
    <button onclick={handleExport} disabled={isExporting}>Export</button>
    <button onclick={onClose} disabled={isExporting}>Cancel</button>
  </div>
</div>
```

---

## Performance Targets

| Metric | Target | Notes |
|--------|--------|-------|
| **Export time** | 10 papers: 2-3s | Async with progress UI |
| | 100 papers: 5-15s | Progress updates every 5% |
| | 500 papers: 30-60s | Consider Web Worker for >500 |
| **File size** | 10 papers: 5-10MB | No PDFs; ~500KB per paper |
| | 50 papers: 20-40MB | HTML + JSON, compressed |
| | 100 papers w/PDFs: 200MB+ | PDFs are bulk (5-50MB each) |
| **Compression ratio** | 40-50% | HTML/JSON + ZIP DEFLATE |
| **Search speed** | <100ms | lunr.js indexed query |
| **Initial load** | <1s | Decompress ZIP, parse index |

**Optimization strategies:**
- Don't include PDFs by default (toggle, off)
- Yield to event loop every 5-10 papers
- Show progress bar for >20 papers
- Use Web Worker for >500 papers (future)

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|---|---|---|---|
| Single HTML inline | ZIP with assets | 2020s (web standards) | Reduced bloat, enabled modularity |
| Regex markdown parsing | Library (marked.js) | 2010s | Correctness, performance |
| Server-side search | Client-side indexing (lunr.js) | 2010s | Offline capability, privacy |
| PDF embedding as base64 | Optional separate PDFs in ZIP | 2020s (file size awareness) | 50%+ size reduction |
| Custom archive formats | ZIP standard | 1980s+ | Universal compatibility |

**Current best practices:**
- ZIP archiving (PKWARE standard) for document bundles
- JSON for data interchange and re-import
- Full-text indexing (Lucene-style, lunr.js) for search
- Semantic HTML5 for accessibility
- Compression at transport/storage, not content layer

---

## Open Questions

1. **Graph Visualization Format?**
   - What we know: XYFlow provides canvas visualization, GraphFile has node/edge data
   - What's unclear: PNG vs SVG vs JSON (reconstruct) tradeoff
   - Recommendation: Start with PNG snapshot (simplest), add SVG/JSON in Wave 2

2. **Re-import Workflow?**
   - What we know: metadata.json has complete schema
   - What's unclear: merge vs replace, incremental sync
   - Recommendation: Wave 4 feature; document merge strategy when implementing

3. **EPUB Support Timeline?**
   - What we know: epub library (2.1.1) available, standard format exists
   - What's unclear: user demand, priority vs ZIP
   - Recommendation: Defer to Wave 3; ZIP covers 90% of use cases

4. **Annotation Export Format?**
   - What we know: Annotation type exists, includes page/content/type
   - What's unclear: How to render annotations in HTML export
   - Recommendation: Include in metadata.json, render as marginalia in Wave 2

---

## Validation & Testing Strategy

### Unit Tests (required before Wave 0)
```typescript
// tests/services/workspace-export.test.ts
import { describe, it, expect } from 'vitest'
import { exportWorkspace } from '../src/lib/services/workspace-export'

describe('exportWorkspace', () => {
  it('creates valid ZIP with metadata.json', async () => {
    const blob = await exportWorkspace([], [], {}, {})
    const zip = await JSZip.loadAsync(blob)
    expect(zip.file('metadata.json')).toBeDefined()
  })
  
  it('includes all papers in papers/ folder', async () => {
    const papers = [{ id: 'test1', title: 'Test', authors: [] }]
    const blob = await exportWorkspace(papers, [], {}, {})
    const zip = await JSZip.loadAsync(blob)
    expect(zip.folder('papers')?.file('test1.html')).toBeDefined()
  })
  
  it('validates metadata schema on import', async () => {
    const metadata = { version: '1.0', workspace: {}, papers: [], notes: [] }
    expect(validateExportMetadata(metadata)).toBe(true)
    expect(validateExportMetadata({ invalid: true })).toBe(false)
  })
})
```

### Integration Tests
- Export with 10 papers, verify all files present
- Export with PDFs, check file size > base case
- Search index accuracy: verify lunr.js finds relevant papers
- ZIP extraction: verify all files readable after decompress

### Manual Testing Checklist
- ✅ Export small workspace (5-10 papers) — verify ZIP structure
- ✅ Download exported ZIP, unzip locally — verify readable files
- ✅ Open index.html in browser — verify search works offline
- ✅ Large export (100+ papers) — verify progress UI, no UI freeze
- ✅ Re-import metadata.json — verify schema validation

---

## Sources

### Primary (HIGH confidence)
- **JSZip documentation** (3.10.1) — ZIP generation patterns, compression options
- **marked.js documentation** (17.0.4) — Markdown rendering, renderer options
- **lunr.js documentation** (2.3.9) — Index creation, serialization, search API
- **html2canvas documentation** (1.4.1) — Canvas capture, PNG generation
- **Project package.json** — Current dependency versions verified

### Secondary (MEDIUM confidence)
- **ZIP specification (PKWARE)** — Format standards, path separator handling
- **EPUB 3 standard** (epub.org) — Structure for ereader format
- **HTML5 standard (W3C)** — Semantic markup, metadata elements
- **ECMAScript 2020+** — Promise, async/await, Blob API

### Tertiary (Informational)
- **Web Performance Working Group** — Best practices for file generation
- **CommonJS/ESM module systems** — Import patterns for browser/Node

---

## Metadata

**Confidence breakdown:**
- **Standard stack:** HIGH — Verified against npm, all libraries stable and actively maintained
- **Architecture:** HIGH — Patterns based on proven library APIs and project code examination
- **Pitfalls:** MEDIUM-HIGH — Based on domain knowledge + code review; some pitfalls not yet experienced
- **Performance targets:** MEDIUM — Estimated from library benchmarks; actual numbers need measurement

**Research date:** March 2025  
**Valid until:** May 2025 (60 days — re-check for lunr.js updates, JSZip 3.x stability)  
**Next review:** When starting implementation, if >2 months pass

---

## Recommendations Summary

### Immediate (Wave 0)
1. **Add JSZip & lunr.js to package.json**
2. **Create workspace-export.ts service** with ZIP generation
3. **Create search-index.ts service** with lunr integration
4. **Add ExportDialog with scope/options checkboxes**
5. **Write unit tests for ZIP validation**

### Short-term (Wave 1)
1. Implement index.html with embedded search UI
2. Generate paper HTML for each paper with notes
3. Add progress callback and UI feedback
4. Test with 50+ paper export

### Medium-term (Wave 2-3)
1. Graph visualization snapshot (PNG or SVG)
2. EPUB export option (if user demand exists)
3. Single-HTML variant for small subsets
4. Re-import from metadata.json (Wave 3+)

### Deferred (Out of scope this phase)
- Custom graph rendering (use existing XYFlow snapshot)
- Streaming ZIP for very large exports (100MB+)
- Incremental/differential exports
- Encryption or password-protected archives

---

**Next step:** Review recommendations with team. If approved, proceed to `/gsd:plan-phase` to create implementation plan with concrete tasks.
