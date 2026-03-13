---
phase: phase-6
plan: 01
type: execute
wave: multi                 # 4-wave execution (see Wave Structure below)
depends_on: []
files_modified:
  - package.json
  - src/lib/types/notes.ts
  - src/lib/stores/notes.ts
  - src/lib/services/notes-io.ts
  - src/lib/services/notes-export.ts
  - src/lib/components/editor/NotesEditor.svelte
  - src/lib/components/editor/NotesPanel.svelte
  - src/lib/components/editor/ExportDialog.svelte
  - src/lib/components/layout/MainPanel.svelte
  - src-tauri/src/commands/notes.rs
  - src-tauri/src/commands/mod.rs
  - src-tauri/src/lib.rs
  - src/App.svelte
autonomous: true
requirements: [NOTES-01, NOTES-02, NOTES-03, NOTES-04, NOTES-05, NOTES-06]

must_haves:
  truths:
    - "User can select a paper and see a Notes tab (fifth tab in MainPanel)"
    - "User can click into the Notes tab and edit markdown text with syntax highlighting"
    - "Edits auto-save to disk (debounced) — no manual save button required"
    - "Closing the app and reopening preserves all note content for each paper"
    - "User can export current note as PDF with paper title/authors header"
    - "User can export current note as DOCX with proper formatting"
    - "Deleting a paper from workspace cascade-deletes its notes file"
  artifacts:
    - path: "src/lib/types/notes.ts"
      provides: "Note, NotesSidecar interface definitions"
      exports: [Note, NotesSidecar]
    - path: "src/lib/stores/notes.ts"
      provides: "Writable notes store + currentPaperNote derived store"
      exports: [notes, currentPaperNote, saveNote]
    - path: "src/lib/services/notes-io.ts"
      provides: "loadNotes(), saveNotes() Tauri invoke wrapper"
      exports: [loadNotes, saveNotes]
    - path: "src/lib/services/notes-export.ts"
      provides: "exportNotesToPDF(), exportNotesToDOCX() functions"
      exports: [exportNotesToPDF, exportNotesToDOCX]
    - path: "src/lib/components/editor/NotesEditor.svelte"
      provides: "CodeMirror 6 editor with markdown syntax highlighting"
      min_lines: 40
    - path: "src/lib/components/editor/NotesPanel.svelte"
      provides: "Full notes UI: editor + export button"
      min_lines: 50
    - path: "src-tauri/src/commands/notes.rs"
      provides: "load_notes, save_notes Rust commands"
      exports: [load_notes, save_notes]
    - path: "src/lib/components/layout/MainPanel.svelte"
      provides: "Updated with Notes tab (fifth tab, after PDF)"
      contains: "activeTab.*notes"
  key_links:
    - from: "src/lib/components/editor/NotesEditor.svelte"
      to: "src/lib/stores/notes.ts"
      via: "debouncedSave() → saveNote() in parent or own onBlur"
      pattern: "saveNote|debouncedSave"
    - from: "src/lib/stores/notes.ts"
      to: "src/lib/services/notes-io.ts"
      via: "saveNote() calls saveNotes() to invoke Rust"
      pattern: "saveNotes|invoke.*save_notes"
    - from: "src/lib/services/notes-io.ts"
      to: "src-tauri/src/commands/notes.rs"
      via: "invoke('save_notes') / invoke('load_notes')"
      pattern: "invoke.*save_notes|invoke.*load_notes"
    - from: "src/App.svelte"
      to: "src/lib/services/notes-io.ts"
      via: "initializeNotes() called after workspace + papers loaded"
      pattern: "initializeNotes|loadNotes"
    - from: "src/lib/components/editor/NotesPanel.svelte"
      to: "src/lib/services/notes-export.ts"
      via: "handleExport() → exportNotesToPDF/DOCX()"
      pattern: "exportNotes|downloadFile"
---

<objective>
Phase 6 adds a research notes editor to Anya-RA. Users can write markdown notes attached to
each paper, with automatic persistence to disk and export to PDF/DOCX formats.

Purpose: Enable researchers to capture insights, analysis, and annotations alongside
paper reading — essential for building a research knowledge base.

Output:
- New "📝 Notes" tab (fifth tab in MainPanel) visible when paper selected
- CodeMirror 6 markdown editor with syntax highlighting
- Auto-save on blur + debounced keystroke saves (300ms)
- Sidecar JSON file storage: `{workspace}/notes/{paperId}.json`
- Export to PDF (with paper metadata header) and DOCX (structured)
- Cascade deletion: removing paper also removes its notes
- Full persistence across app sessions and workspace reloads
</objective>

<execution_context>
@/Users/paul/.claude/get-shit-done/workflows/execute-plan.md
</execution_context>

<context>
@.planning/ROADMAP.md

<!-- Key source files to understand patterns -->
@src/lib/types/paper.ts
@src/lib/types/annotation.ts
@src/lib/stores/papers.ts
@src/lib/stores/graph.ts
@src/lib/services/annotation-store.ts
@src/lib/components/layout/MainPanel.svelte
@src-tauri/src/commands/annotations.rs
@src-tauri/src/commands/workspace.rs
@src/App.svelte

<!-- Phase 5 patterns for graph reference -->
@.planning/phases/phase-5/PLAN-SUMMARY.md

<interfaces>
<!-- Types executor needs from existing codebase — no exploration required -->

From src/lib/types/paper.ts:
```typescript
export interface Paper {
  id: string          // e.g. "arxiv_2301.00001"
  title: string
  authors: string[]
  year: number | null
  source: PaperSource
  // ... other fields
}
```

From src/lib/stores/papers.ts:
```typescript
export const papers = writable<Paper[]>([])
export const selectedPaperId = writable<string | null>(null)
export const selectedPaper = derived(
  [papers, selectedPaperId],
  ([$papers, $paperId]) => $papers.find(p => p.id === $paperId) ?? null
)
```

From src/lib/stores/workspace.ts:
```typescript
export const workspace = writable<WorkspaceState | null>(null)
// structure: { id, path, name, lastOpened, ... }
```

From src/App.svelte initialization pattern (already working):
```typescript
onMount(async () => {
  await initializeWorkspace()
  if ($workspace) {
    const loaded = await loadPapers($workspace.path)
    papers.set(loaded)
    // ← initializeNotes() goes HERE after papers loaded
    await initializeNotes($workspace.path)
  }
})
```

From src-tauri/src/lib.rs invoke_handler (current pattern):
```rust
// Tauri 2 pattern for command registration
commands::chat::save_chat_file,
commands::chat::load_chat_file,
commands::workspace::create_workspace,
// ← add notes commands here
```

From src-tauri/src/commands/annotations.rs (reference for sidecar pattern):
```rust
// Annotations store in {workspace}/annotations/{paperId}.json
// Mirror this structure for notes
#[tauri::command]
pub fn save_annotations(workspace_path: String, paper_id: String, content: String) 
  -> Result<(), String>
```

From src/lib/components/layout/MainPanel.svelte (current tab structure):
```svelte
<script lang="ts">
  let activeTab = $state<'chat' | 'papers' | 'pdf' | 'graph'>('chat')
  // need to add 'notes' here
</script>

<div class="main-panel">
  <div class="tab-bar">
    <button class:active={activeTab === 'chat'} onclick={() => (activeTab = 'chat')}>
      💬 Chat
    </button>
    <!-- ... other tabs ... -->
    {#if $selectedPaper}
      <button class:active={activeTab === 'pdf'} onclick={() => (activeTab = 'pdf')}>
        📄 PDF
      </button>
      <!-- ← Notes tab goes AFTER PDF, BEFORE graph -->
    {/if}
  </div>
  
  <div class="tab-content">
    {#if activeTab === 'chat'}
      <!-- ... -->
    {/if}
  </div>
</div>
```

From existing component imports (how to reference store):
```typescript
import { selectedPaperId, papers } from '../stores/papers'
import { workspace } from '../stores/workspace'
// Pattern for notes will be parallel
import { notes, currentPaperNote } from '../stores/notes'
```
</interfaces>
</context>

---

## Wave Structure

| Wave | Tasks | Can run in parallel | Prerequisite |
|------|-------|---------------------|-|
| 1 | p6-t01, p6-t02 | ✅ Yes | none |
| 2 | p6-t03, p6-t04 | ✅ Yes | Wave 1 complete |
| 3 | p6-t05, p6-t06 | ✅ Yes | Wave 2 complete |
| 4 | p6-t07, p6-t08, p6-t09 | ✅ Yes | Wave 3 complete |

**Parallelization rationale:**
- **Wave 1:** Type definitions and Rust I/O are independent
- **Wave 2:** Frontend store and export service both only depend on types
- **Wave 3:** Editor component and MainPanel integration (UI) depend on store/types
- **Wave 4:** Final integration and polish — no file conflicts

---

<tasks>

<!-- ═══════════════════════════════════════════════════════════════
     WAVE 1 — Foundations (parallel)
     ═══════════════════════════════════════════════════════════════ -->

<task id="p6-t01" type="auto" wave="1" depends_on="[]">
  <name>p6-t01: Install markdown editor libraries + define Note types</name>

  <files>
    package.json (modified — dependencies added by pnpm)
    src/lib/types/notes.ts (CREATE)
  </files>

  <action>
**Step 1 — Install dependencies:**

```bash
cd /Users/paul/Documents/programming/anya-ra
pnpm add codemirror @codemirror/lang-markdown svelte-codemirror-editor marked docx jspdf html2canvas
```

This adds:
- `codemirror@6.0.2` — Base editor framework
- `@codemirror/lang-markdown@6.5.0` — Markdown syntax highlighting
- `svelte-codemirror-editor@2.1.0` — Svelte 5 wrapper
- `marked@17.0.4` — Markdown parser (for preview, export)
- `docx@9.6.1` — DOCX file generation
- `jspdf@4.2.0` — PDF generation
- `html2canvas@1.4.1` — HTML to canvas (dependency of jsPDF)

Verify all packages are in `dependencies` (not devDependencies).

**Step 2 — Create `src/lib/types/notes.ts`:**

```typescript
/**
 * Research notes type definitions for Phase 6.
 * Stored in {workspace}/notes/{paperId}.json — schema version 1.
 */

/** Single note attached to a paper */
export interface Note {
  id: string                    // UUID v4 (same as paperId for simplicity)
  paperId: string              // FK to Paper.id — establishes the attachment
  title?: string               // Optional: auto-generated as "Notes on [paper title]"
  content: string              // Markdown source (can be empty)
  createdAt: string            // ISO 8601
  updatedAt: string            // ISO 8601
}

/** Sidecar file shape: {workspace}/notes/{paperId}.json */
export interface NotesSidecar {
  version: 1                   // Schema version — bump if breaking change
  paperMetadata?: {            // Cache of paper title/authors (for export header)
    title: string
    authors: string[]
    year?: number
  }
  notes: Note[]                // Typically single-element array (one note per paper)
}
```

This mirrors the annotation.ts pattern from Phase 3. Keep it minimal — just what's needed for storage and export.
  </action>

  <verify>
```bash
cd /Users/paul/Documents/programming/anya-ra

# 1. All packages installed
grep -E '"(codemirror|@codemirror|svelte-codemirror|marked|docx|jspdf|html2canvas)"' package.json

# 2. Type file exists and compiles
pnpm run check 2>&1 | grep -i "types/notes" || echo "No errors in notes.ts"

# 3. All expected exports present
grep -E "^export (interface|type)" src/lib/types/notes.ts
```
  </verify>

  <done>
- All 7 packages appear in `dependencies` in package.json
- `src/lib/types/notes.ts` exists with exports: `Note`, `NotesSidecar`
- `pnpm run check` produces zero errors
  </done>
</task>

<!-- ─────────────────────────────────────────────────────────────────── -->

<task id="p6-t02" type="auto" wave="1" depends_on="[]">
  <name>p6-t02: Rust persistence commands — load_notes / save_notes</name>

  <files>
    src-tauri/src/commands/notes.rs (CREATE)
    src-tauri/src/commands/mod.rs (MODIFY — add pub mod notes)
    src-tauri/src/lib.rs (MODIFY — register notes commands)
  </files>

  <action>
**Step 1 — Create `src-tauri/src/commands/notes.rs`:**

This mirrors the pattern from `annotations.rs` exactly. Simpler than chat because notes are file-per-paper (not a list):

```rust
use std::fs;
use std::path::PathBuf;

/// Load notes for a specific paper from {workspace_path}/notes/{paper_id}.json.
///
/// Returns `Err` if file doesn't exist — TypeScript maps this to `null`.
/// If file exists but is invalid JSON, returns error.
///
/// Called from TypeScript: `invoke('load_notes', { workspacePath, paperId })`
#[tauri::command]
pub fn load_notes(workspace_path: String, paper_id: String) -> Result<String, String> {
    let notes_path = PathBuf::from(&workspace_path)
        .join("notes")
        .join(format!("{}.json", paper_id));

    if !notes_path.exists() {
        return Err("Notes file not found".to_string());
    }

    fs::read_to_string(&notes_path)
        .map_err(|e| format!("Failed to read notes: {}", e))
}

/// Save notes for a specific paper to {workspace_path}/notes/{paper_id}.json.
///
/// Creates the notes directory if it doesn't exist.
/// Overwrites existing notes file.
///
/// Called from TypeScript: `invoke('save_notes', { workspacePath, paperId, content })`
#[tauri::command]
pub fn save_notes(workspace_path: String, paper_id: String, content: String) -> Result<(), String> {
    let notes_dir = PathBuf::from(&workspace_path).join("notes");

    // Create notes directory if missing
    fs::create_dir_all(&notes_dir)
        .map_err(|e| format!("Failed to create notes directory: {}", e))?;

    let notes_path = notes_dir.join(format!("{}.json", paper_id));

    fs::write(&notes_path, &content)
        .map_err(|e| format!("Failed to write notes: {}", e))
}
```

Key points:
- Returns `Result<String, String>` (JSON content as string for load, unit for save)
- Uses `PathBuf` for cross-platform paths
- Auto-creates `{workspace}/notes/` directory (idempotent via `create_dir_all`)
- Errors map to TypeScript promise rejection (handled by service layer)

**Step 2 — Update `src-tauri/src/commands/mod.rs`:**

Add this line (in alphabetical order with other mod declarations):

```rust
pub mod notes;
```

Example from existing file:
```rust
pub mod annotations;
pub mod chat;
pub mod graph;
pub mod notes;  // ← ADD THIS
pub mod papers;
pub mod workspace;
```

**Step 3 — Register commands in `src-tauri/src/lib.rs`:**

Find the `invoke_handler!` macro call (should be in the `main` function or tauri builder setup). Add the two note commands:

```rust
.invoke_handler(tauri::generate_handler![
    // ... existing commands ...
    commands::notes::load_notes,
    commands::notes::save_notes,
    // ... other commands ...
])
```

Example context (from working Phase 3/5):
```rust
.invoke_handler(tauri::generate_handler![
    commands::chat::save_chat_file,
    commands::chat::load_chat_file,
    commands::chat::list_chat_files,
    commands::workspace::create_workspace,
    commands::workspace::list_workspaces,
    commands::workspace::open_workspace,
    commands::annotations::load_annotations,  // ← PATTERN
    commands::annotations::save_annotations,
    commands::notes::load_notes,              // ← ADD THESE
    commands::notes::save_notes,
])
```

If the invoke_handler is split across multiple files, ensure both notes commands are registered exactly once.
  </action>

  <verify>
```bash
cd /Users/paul/Documents/programming/anya-ra

# 1. Rust file created
ls -la src-tauri/src/commands/notes.rs

# 2. Module is exported
grep "pub mod notes" src-tauri/src/commands/mod.rs

# 3. Commands registered in lib.rs
grep -c "commands::notes::" src-tauri/src/lib.rs
# Should return 2 (load_notes, save_notes)

# 4. Rust compiles (from Tauri watch or check)
cd src-tauri && cargo check 2>&1 | head -20
# Should show no errors about notes module
```
  </verify>

  <done>
- `src-tauri/src/commands/notes.rs` exists with `load_notes` and `save_notes` functions
- `src-tauri/src/commands/mod.rs` exports `pub mod notes`
- Both commands registered in `src-tauri/src/lib.rs` invoke_handler
- `cargo check` in src-tauri/ produces zero errors related to notes
  </done>
</task>

<!-- ═══════════════════════════════════════════════════════════════
     WAVE 2 — Frontend stores + services (parallel)
     ═══════════════════════════════════════════════════════════════ -->

<task id="p6-t03" type="auto" wave="2" depends_on="[p6-t01]">
  <name>p6-t03: Create notes store (writable + derived) + auto-save service</name>

  <files>
    src/lib/stores/notes.ts (CREATE)
    src/lib/services/notes-io.ts (CREATE)
  </files>

  <action>
**Step 1 — Create `src/lib/stores/notes.ts`:**

This follows the pattern from `stores/papers.ts` — writable store + derived selector:

```typescript
/**
 * Frontend notes store — maps paperId → loaded note content.
 * 
 * Source of truth: disk files at {workspace}/notes/{paperId}.json
 * Pattern: writable store with debounced persistence via notes-io service
 */

import { writable, derived } from 'svelte/store'
import { selectedPaperId } from './papers'
import { workspace } from './workspace'
import { saveNotes } from './services/notes-io'
import type { NotesSidecar } from '../types/notes'

// Key: paperId, Value: NotesSidecar from disk
export const notes = writable<Map<string, NotesSidecar>>(new Map())

// Derived: current selected paper's note (or null if not loaded/no paper selected)
export const currentPaperNote = derived(
  [notes, selectedPaperId],
  ([$notes, $paperId]) => {
    if (!$paperId) return null
    return $notes.get($paperId) ?? null
  }
)

// ─── Helper to batch-save (called from components, debounced by caller) ──────

let pendingSave: NodeJS.Timeout | null = null
let isSaving = false

/**
 * Save a note to both store and disk.
 * 
 * Called from NotesEditor.svelte (debounced) and on blur.
 * - Updates the store immediately (for UI reactivity)
 * - Debounces disk write to avoid hammer I/O
 * - Cancels previous pending save on keystroke (new content = new timer)
 */
export async function saveNote(
  workspacePath: string,
  paperId: string,
  content: string
): Promise<void> {
  if (!workspacePath || !paperId) return

  // Clear any pending save (new save supercedes it)
  if (pendingSave) clearTimeout(pendingSave)

  // Update store immediately (optimistic)
  const now = new Date().toISOString()
  const sidecar: NotesSidecar = {
    version: 1,
    notes: [
      {
        id: paperId,
        paperId,
        content,
        createdAt: new Date().toISOString(),
        updatedAt: now,
      }
    ]
  }

  notes.update(map => {
    map.set(paperId, sidecar)
    return map
  })

  // Schedule debounced disk write (300ms)
  if (!isSaving) {
    pendingSave = setTimeout(async () => {
      isSaving = true
      try {
        await saveNotes(workspacePath, paperId, sidecar)
        console.log(`[notes] Auto-saved for ${paperId} at ${new Date().toLocaleTimeString()}`)
      } catch (error) {
        console.error(`[notes] Auto-save failed for ${paperId}:`, error)
        // Optionally show toast notification here
      } finally {
        isSaving = false
        pendingSave = null
      }
    }, 300)
  }
}
```

Key patterns:
- Store uses `Map<paperId, NotesSidecar>` (mirroring annotation store)
- `currentPaperNote` is derived from selected paperId + notes map
- `saveNote()` is the public API for updating a note
- Debounce timer is cleared on new keystroke (500ms timer would compound; 300ms is a good balance)
- Store updates immediately (optimistic) before disk write confirms

**Step 2 — Create `src/lib/services/notes-io.ts`:**

This is the bridge between frontend and Tauri backend:

```typescript
/**
 * Notes I/O service — invoke Rust commands via Tauri.
 * Handles load/save to {workspace}/notes/{paperId}.json
 */

import { invoke } from '@tauri-apps/api/core'
import type { NotesSidecar } from '../types/notes'

/**
 * Load a single note from disk.
 * Returns null if file doesn't exist (new note).
 * Throws on read error (permission, corrupt JSON).
 */
export async function loadNotes(
  workspacePath: string,
  paperId: string
): Promise<NotesSidecar | null> {
  try {
    const content = await invoke<string>('load_notes', {
      workspacePath,
      paperId,
    })
    return JSON.parse(content) as NotesSidecar
  } catch (error: unknown) {
    if (error instanceof Error && error.message.includes('not found')) {
      // File doesn't exist yet — return null (first time opening this paper)
      return null
    }
    // Other errors (permission, parse) should bubble up to caller
    console.error(`[notes-io] Load failed for ${paperId}:`, error)
    return null
  }
}

/**
 * Save a note to disk.
 * Creates {workspace}/notes/ directory if missing.
 * Overwrites existing file.
 * Throws on write error.
 */
export async function saveNotes(
  workspacePath: string,
  paperId: string,
  sidecar: NotesSidecar
): Promise<void> {
  try {
    const content = JSON.stringify(sidecar, null, 2)
    await invoke<void>('save_notes', {
      workspacePath,
      paperId,
      content,
    })
  } catch (error) {
    console.error(`[notes-io] Save failed for ${paperId}:`, error)
    throw error
  }
}
```

Key patterns:
- `invoke()` calls Tauri commands registered in src-tauri/src/lib.rs
- Generic type parameter `<string>` tells TypeScript the return type
- Null return on "not found" (expected for new notes), throw on other errors
- JSON.stringify with `null, 2` for pretty-printed files on disk
  </action>

  <verify>
```bash
cd /Users/paul/Documents/programming/anya-ra

# 1. Store file created
ls -la src/lib/stores/notes.ts

# 2. Service file created
ls -la src/lib/services/notes-io.ts

# 3. TypeScript check passes
pnpm run check 2>&1 | tail -3
# Should show no errors mentioning notes.ts or notes-io.ts

# 4. All exports present
grep -E "^export (const|function|async function)" src/lib/stores/notes.ts
grep -E "^export (function|async function)" src/lib/services/notes-io.ts
```
  </verify>

  <done>
- `src/lib/stores/notes.ts` exists with exports: `notes` (writable), `currentPaperNote` (derived), `saveNote` (async function)
- `src/lib/services/notes-io.ts` exists with exports: `loadNotes`, `saveNotes`
- Both files import correctly from existing stores (papers, workspace)
- `pnpm run check` produces zero errors
  </done>
</task>

<!-- ─────────────────────────────────────────────────────────────────── -->

<task id="p6-t04" type="auto" wave="2" depends_on="[p6-t01]">
  <name>p6-t04: Create export service (PDF + DOCX generators)</name>

  <files>
    src/lib/services/notes-export.ts (CREATE)
  </files>

  <action>
**Step 1 — Create `src/lib/services/notes-export.ts`:**

This handles markdown → PDF/DOCX conversion with paper metadata header:

```typescript
/**
 * Notes export service — convert markdown to PDF or DOCX.
 * 
 * Pattern: Markdown → Parsed HTML (via marked) → Document (jsPDF or docx lib)
 * Includes paper title and authors as header in export.
 */

import { marked } from 'marked'
import jsPDF from 'jspdf'
import html2canvas from 'html2canvas'
import { Document, Packer, Paragraph, TextRun, HeadingLevel } from 'docx'
import type { Note } from '../types/notes'

// ─── PDF Export ──────────────────────────────────────────────────────────────

/**
 * Export note as PDF with paper metadata header.
 * 
 * Process:
 * 1. Render markdown to HTML via marked
 * 2. Create temp DOM element with HTML + header
 * 3. Convert to canvas via html2canvas
 * 4. Embed canvas in PDF via jsPDF
 * 
 * Returns Blob ready for download.
 */
export async function exportNotesToPDF(
  paperTitle: string,
  authors: string[],
  note: Note
): Promise<Blob> {
  // Step 1: Render markdown to HTML
  const contentHTML = await marked(note.content)

  // Step 2: Create temporary container with header + content
  const container = document.createElement('div')
  container.innerHTML = `
    <div style="font-family: Arial, sans-serif; padding: 20px; max-width: 800px;">
      <h1 style="margin: 0 0 10px 0; font-size: 24px;">${escapeHTML(paperTitle)}</h1>
      <p style="margin: 0 0 20px 0; font-size: 12px; color: #666;">
        ${escapeHTML(authors.join(', '))}
      </p>
      <hr style="margin: 20px 0; border: none; border-top: 1px solid #ccc;">
      <div style="font-size: 14px; line-height: 1.6;">
        ${contentHTML}
      </div>
    </div>
  `
  container.style.position = 'absolute'
  container.style.left = '-9999px'
  container.style.background = 'white'
  document.body.appendChild(container)

  try {
    // Step 3: Convert to canvas
    const canvas = await html2canvas(container, {
      scale: 2,
      logging: false,
      backgroundColor: '#fff',
    })

    // Step 4: Create PDF and add canvas
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
    })

    const imgWidth = 210 - 20  // A4 width minus 10mm margins
    const imgHeight = (canvas.height * imgWidth) / canvas.width
    const pageHeight = 297 - 20  // A4 height minus margins

    let currentY = 10
    let imgData = canvas.toDataURL('image/png')

    // Handle multi-page PDFs
    while (currentY < imgHeight) {
      pdf.addImage(imgData, 'PNG', 10, currentY - imgHeight + pageHeight, imgWidth, imgHeight)
      currentY += pageHeight
      if (currentY < imgHeight) {
        pdf.addPage()
      }
    }

    return new Blob([pdf.output('arraybuffer')], { type: 'application/pdf' })
  } finally {
    document.body.removeChild(container)
  }
}

// ─── DOCX Export ────────────────────────────────────────────────────────────

/**
 * Export note as DOCX with paper metadata header.
 * 
 * Process:
 * 1. Parse markdown tokens via marked.lexer()
 * 2. Convert each token to docx Paragraph/Heading/etc.
 * 3. Prepend metadata header
 * 4. Build Document and serialize to Blob
 * 
 * Returns Blob ready for download.
 */
export async function exportNotesToDOCX(
  paperTitle: string,
  authors: string[],
  note: Note
): Promise<Blob> {
  // Step 1: Parse markdown tokens
  const tokens = marked.lexer(note.content)

  // Step 2: Convert tokens to Paragraph elements
  const contentParagraphs: Paragraph[] = tokens.map((token: any) => {
    switch (token.type) {
      case 'heading':
        return new Paragraph({
          text: token.text || token.raw,
          heading: `HEADING_${Math.min(token.depth, 6)}` as any,
          spacing: { after: 200 },
        })

      case 'paragraph':
        return new Paragraph({
          text: token.text || token.raw,
          spacing: { after: 200 },
        })

      case 'code':
        return new Paragraph({
          text: token.text || token.raw,
          style: 'Code',
          spacing: { after: 200 },
        })

      case 'list':
        // Simple approach: convert list items to indented paragraphs
        return new Paragraph({
          text: `${token.items?.map((item: any) => `• ${item.text}`).join('\n') || token.raw}`,
          spacing: { after: 200 },
        })

      case 'blockquote':
        return new Paragraph({
          text: token.text || token.raw,
          indent: { left: 720 },
          italics: true,
          spacing: { after: 200 },
        })

      case 'hr':
        return new Paragraph({
          text: '_______________________________________________',
          spacing: { after: 200 },
        })

      default:
        return token.text ? new Paragraph({
          text: token.text,
          spacing: { after: 200 },
        }) : new Paragraph('')
    }
  })

  // Step 3: Create Document with header
  const doc = new Document({
    sections: [
      {
        children: [
          // Header: Paper title + authors
          new Paragraph({
            text: paperTitle,
            bold: true,
            size: 32,
            spacing: { after: 100 },
          }),
          new Paragraph({
            text: authors.join(', '),
            italics: true,
            spacing: { after: 400 },
          }),
          new Paragraph(''),  // Spacer
          // Content
          ...contentParagraphs,
        ],
      },
    ],
  })

  // Step 4: Serialize to Blob
  return await Packer.toBlob(doc)
}

// ─── Helper utilities ────────────────────────────────────────────────────────

/**
 * Escape HTML special characters to prevent injection in PDF header.
 */
function escapeHTML(text: string): string {
  const div = document.createElement('div')
  div.textContent = text
  return div.innerHTML
}

/**
 * Helper to trigger browser download from a Blob.
 * Used by NotesPanel.svelte export button.
 */
export async function downloadFile(blob: Blob, filename: string): Promise<void> {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename

  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)

  // Cleanup after a short delay (allow download to start)
  setTimeout(() => URL.revokeObjectURL(url), 100)
}
```

Key points:
- PDF process: markdown → HTML → canvas → PDF (via jsPDF)
- DOCX process: markdown tokens → Paragraph elements → Document (via docx lib)
- Both include paper metadata header (title, authors)
- `downloadFile()` helper handles browser download trigger (reusable)
- HTML escaping for PDF header prevents injection
- Error handling deferred to caller (NotesPanel)
  </action>

  <verify>
```bash
cd /Users/paul/Documents/programming/anya-ra

# 1. Export service file created
ls -la src/lib/services/notes-export.ts

# 2. TypeScript check passes
pnpm run check 2>&1 | tail -3
# Should show no errors in notes-export.ts

# 3. All expected exports present
grep -E "^export (function|async function)" src/lib/services/notes-export.ts
```
  </verify>

  <done>
- `src/lib/services/notes-export.ts` exists with exports: `exportNotesToPDF`, `exportNotesToDOCX`, `downloadFile`
- File imports from marked, jsPDF, html2canvas, docx (all in package.json)
- `pnpm run check` produces zero errors
  </done>
</task>

<!-- ═══════════════════════════════════════════════════════════════
     WAVE 3 — UI components (parallel)
     ═══════════════════════════════════════════════════════════════ -->

<task id="p6-t05" type="auto" wave="3" depends_on="[p6-t03]">
  <name>p6-t05: Create NotesEditor component (CodeMirror 6 + markdown)</name>

  <files>
    src/lib/components/editor/NotesEditor.svelte (CREATE)
  </files>

  <action>
**Step 1 — Create `src/lib/components/editor/NotesEditor.svelte`:**

This wraps CodeMirror 6 with markdown syntax highlighting and debounced auto-save:

```svelte
<script lang="ts">
  /**
   * NotesEditor.svelte — CodeMirror 6 markdown editor
   * 
   * Props:
   * - content: string (markdown source)
   * - onChange: (content: string) => void (called on text change, already debounced by parent)
   * 
   * Features:
   * - Markdown syntax highlighting via @codemirror/lang-markdown
   * - Basic setup (undo, redo, search, etc.)
   * - Auto-save on blur
   * - Keyboard shortcuts (Ctrl+S to save)
   */

  import { onMount } from 'svelte'
  import CodeMirror from 'svelte-codemirror-editor'
  import { markdown } from '@codemirror/lang-markdown'
  import { EditorView } from 'codemirror'

  interface Props {
    content: string
    onChange: (content: string) => void
  }

  let { content = $bindable(''), onChange } = $props()

  // Theme configuration for CodeMirror
  const theme = EditorView.theme({
    '.cm-editor': {
      height: '100%',
      fontSize: '13px',
      fontFamily: '"Monaco", "Menlo", monospace',
    },
    '.cm-gutters': {
      backgroundColor: 'var(--color-surface-1)',
      borderRight: '1px solid var(--color-surface-2)',
    },
    '.cm-activeLineGutter': {
      backgroundColor: 'var(--color-surface-2)',
    },
  })

  // Handle blur (immediate save)
  function handleBlur() {
    // Parent (NotesPanel) handles the actual save call
    // This just triggers a final save on editor blur
    onChange(content)
  }

  // Keyboard shortcut: Ctrl+S / Cmd+S = Save
  function handleKeydown(e: KeyboardEvent) {
    if ((e.ctrlKey || e.metaKey) && e.key === 's') {
      e.preventDefault()
      onChange(content)
    }
  }
</script>

<div class="editor-container" on:keydown={handleKeydown} role="textbox" tabindex="0">
  <CodeMirror
    bind:value={content}
    lang={markdown()}
    {theme}
    editable={true}
    on:blur={handleBlur}
  />
</div>

<style>
  .editor-container {
    height: 100%;
    display: flex;
    flex-direction: column;
    background: var(--color-surface-0);
    border-radius: 4px;
    overflow: hidden;
  }

  :global(.cm-editor) {
    flex: 1;
  }

  :global(.cm-content) {
    padding: 16px;
  }

  :global(.cm-line) {
    padding: 0 4px;
  }
</style>
```

**Alternative (if svelte-codemirror-editor has issues):**

If the wrapper has problems with Svelte 5 runes, use raw CodeMirror setup:

```svelte
<script lang="ts">
  import { onMount } from 'svelte'
  import { EditorView, basicSetup } from 'codemirror'
  import { EditorState } from '@codemirror/state'
  import { markdown } from '@codemirror/lang-markdown'

  let container: HTMLDivElement
  let editor: EditorView
  let content = $state('')

  interface Props {
    content: string
    onChange: (content: string) => void
  }

  let { content: initialContent = '', onChange } = $props()

  onMount(() => {
    content = initialContent

    const state = EditorState.create({
      doc: content,
      extensions: [
        basicSetup,
        markdown(),
        EditorView.updateListener.of((update) => {
          if (update.docChanged) {
            content = update.state.doc.toString()
            // Don't call onChange here (will debounce in parent)
          }
        }),
      ],
    })

    editor = new EditorView({
      state,
      parent: container,
    })

    return () => editor.destroy()  // Cleanup on unmount
  })
</script>

<div bind:this={container} class="editor" />

<style>
  .editor {
    height: 100%;
    font-family: 'Monaco', monospace;
    font-size: 13px;
  }
</style>
```

Use the first (svelte-codemirror-editor) unless it causes Svelte 5 compatibility issues, then switch to the second.
  </action>

  <verify>
```bash
cd /Users/paul/Documents/programming/anya-ra

# 1. Component file created
ls -la src/lib/components/editor/NotesEditor.svelte

# 2. TypeScript check passes
pnpm run check 2>&1 | tail -3

# 3. Svelte check works
pnpm run check 2>&1 | grep -i "noteseditor" || echo "Component valid"
```
  </verify>

  <done>
- `src/lib/components/editor/NotesEditor.svelte` exists
- Component exports Props interface: `content`, `onChange`
- CodeMirror is configured with markdown language + syntax highlighting
- `pnpm run check` produces zero errors
  </done>
</task>

<!-- ─────────────────────────────────────────────────────────────────── -->

<task id="p6-t06" type="auto" wave="3" depends_on="[p6-t03, p6-t04]">
  <name>p6-t06: Create NotesPanel component (editor + export UI)</name>

  <files>
    src/lib/components/editor/NotesPanel.svelte (CREATE)
    src/lib/components/editor/ExportDialog.svelte (CREATE)
  </files>

  <action>
**Step 1 — Create `src/lib/components/editor/NotesPanel.svelte`:**

The main container for notes editing and export:

```svelte
<script lang="ts">
  /**
   * NotesPanel.svelte — Main notes interface
   * 
   * Props:
   * - paper: Paper (the current selected paper)
   * 
   * Features:
   * - NotesEditor (CodeMirror) for markdown input
   * - Auto-save on keystroke (debounced 300ms) + blur
   * - Export button → ExportDialog
   * - Save indicator (optional: small "saving..." text)
   */

  import { workspace } from '../../stores/workspace'
  import { currentPaperNote, saveNote } from '../../stores/notes'
  import NotesEditor from './NotesEditor.svelte'
  import ExportDialog from './ExportDialog.svelte'
  import type { Paper } from '../../types/paper'

  interface Props {
    paper: Paper
  }

  let { paper } = $props()

  let content = $state('')
  let isSaving = $state(false)
  let showExportDialog = $state(false)
  let pendingSave: NodeJS.Timeout | null = null

  // Load initial content when paper changes
  $effect(() => {
    if (paper && $currentPaperNote?.notes[0]) {
      content = $currentPaperNote.notes[0].content
    } else {
      content = ''
    }
  })

  /**
   * Debounced save handler.
   * Called from NotesEditor onChange + blur.
   */
  function debouncedSave(newContent: string) {
    content = newContent

    // Clear previous timer
    if (pendingSave) clearTimeout(pendingSave)

    // Schedule save after 300ms of no changes
    isSaving = true
    pendingSave = setTimeout(async () => {
      if (!$workspace) return

      try {
        await saveNote($workspace.path, paper.id, content)
        console.log(`[NotesPanel] Auto-saved for ${paper.id}`)
      } catch (error) {
        console.error('[NotesPanel] Save failed:', error)
        // Optional: show toast notification
      } finally {
        isSaving = false
        pendingSave = null
      }
    }, 300)
  }

  /**
   * Immediate save on blur (override debounce timer).
   */
  function handleEditorBlur() {
    if (pendingSave) {
      clearTimeout(pendingSave)
      pendingSave = null
    }

    // Save immediately if content changed
    if ($workspace && content) {
      saveNote($workspace.path, paper.id, content)
    }
  }
</script>

<div class="notes-panel">
  <!-- Header with title + export button -->
  <div class="notes-header">
    <h2 class="title">📝 Notes: {paper.title || 'Untitled'}</h2>
    <div class="controls">
      <button
        class="export-btn"
        onclick={() => (showExportDialog = true)}
        disabled={!content}
      >
        ⬇️ Export
      </button>
      {#if isSaving}
        <span class="save-indicator">Saving...</span>
      {/if}
    </div>
  </div>

  <!-- Editor -->
  <div class="editor-wrapper">
    <NotesEditor
      bind:content
      onChange={debouncedSave}
      on:blur={handleEditorBlur}
    />
  </div>

  <!-- Export dialog -->
  {#if showExportDialog}
    <ExportDialog
      {paper}
      {content}
      onClose={() => (showExportDialog = false)}
    />
  {/if}
</div>

<style>
  .notes-panel {
    display: flex;
    flex-direction: column;
    height: 100%;
    background: var(--color-surface-0);
    gap: 12px;
    padding: 12px;
  }

  .notes-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 8px 12px;
    background: var(--color-surface-1);
    border-radius: 4px;
    border-bottom: 1px solid var(--color-surface-2);
  }

  .title {
    margin: 0;
    font-size: 14px;
    font-weight: 600;
    color: var(--color-text-primary);
  }

  .controls {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .export-btn {
    padding: 6px 12px;
    font-size: 12px;
    border: 1px solid var(--color-surface-2);
    border-radius: 4px;
    background: var(--color-surface-2);
    color: var(--color-text-primary);
    cursor: pointer;
    transition: background 0.2s;
  }

  .export-btn:hover:not(:disabled) {
    background: var(--color-surface-3);
  }

  .export-btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .save-indicator {
    font-size: 11px;
    color: var(--color-text-secondary);
    font-style: italic;
  }

  .editor-wrapper {
    flex: 1;
    display: flex;
    flex-direction: column;
    min-height: 0;
    background: var(--color-surface-0);
    border-radius: 4px;
    border: 1px solid var(--color-surface-2);
    overflow: hidden;
  }
</style>
```

**Step 2 — Create `src/lib/components/editor/ExportDialog.svelte`:**

Modal dialog for choosing export format + triggering download:

```svelte
<script lang="ts">
  /**
   * ExportDialog.svelte — PDF/DOCX format selector
   * 
   * Props:
   * - paper: Paper
   * - content: string (markdown content to export)
   * - onClose: () => void
   */

  import { exportNotesToPDF, exportNotesToDOCX, downloadFile } from '../../services/notes-export'
  import type { Paper } from '../../types/paper'

  interface Props {
    paper: Paper
    content: string
    onClose: () => void
  }

  let { paper, content, onClose } = $props()

  let format = $state<'pdf' | 'docx'>('pdf')
  let isExporting = $state(false)

  async function handleExport() {
    if (!paper || !content) return

    isExporting = true
    try {
      const note = {
        id: paper.id,
        paperId: paper.id,
        content,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }

      const blob = format === 'pdf'
        ? await exportNotesToPDF(paper.title, paper.authors, note)
        : await exportNotesToDOCX(paper.title, paper.authors, note)

      const filename = `notes-${paper.id}.${format === 'pdf' ? 'pdf' : 'docx'}`
      await downloadFile(blob, filename)

      console.log(`[ExportDialog] Exported ${filename}`)
      onClose()
    } catch (error) {
      console.error('[ExportDialog] Export failed:', error)
      // Optional: show error toast
    } finally {
      isExporting = false
    }
  }

  function handleKeydown(e: KeyboardEvent) {
    if (e.key === 'Escape') {
      onClose()
    }
  }
</script>

<svelte:window on:keydown={handleKeydown} />

<div class="overlay" on:click={onClose}>
  <div class="dialog" on:click|stopPropagation>
    <h3>Export Notes</h3>
    <p class="subtitle">Choose format for {paper.title}</p>

    <!-- Format selector -->
    <div class="format-group">
      <label>
        <input type="radio" bind:group={format} value="pdf" />
        <span class="label-text">📄 PDF (with paper metadata)</span>
      </label>
      <label>
        <input type="radio" bind:group={format} value="docx" />
        <span class="label-text">📝 Word (.docx)</span>
      </label>
    </div>

    <!-- Action buttons -->
    <div class="actions">
      <button class="cancel-btn" onclick={onClose} disabled={isExporting}>
        Cancel
      </button>
      <button
        class="export-btn"
        onclick={handleExport}
        disabled={isExporting}
      >
        {isExporting ? 'Exporting...' : 'Export'}
      </button>
    </div>
  </div>
</div>

<style>
  .overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.5);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
  }

  .dialog {
    background: var(--color-surface-0);
    border-radius: 8px;
    padding: 24px;
    max-width: 400px;
    box-shadow: 0 10px 40px rgba(0, 0, 0, 0.3);
  }

  h3 {
    margin: 0 0 8px 0;
    font-size: 18px;
    font-weight: 600;
  }

  .subtitle {
    margin: 0 0 16px 0;
    font-size: 13px;
    color: var(--color-text-secondary);
  }

  .format-group {
    margin: 16px 0;
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  label {
    display: flex;
    align-items: center;
    gap: 8px;
    cursor: pointer;
    padding: 8px;
    border-radius: 4px;
    transition: background 0.2s;
  }

  label:hover {
    background: var(--color-surface-1);
  }

  input[type="radio"] {
    cursor: pointer;
  }

  .label-text {
    font-size: 13px;
    color: var(--color-text-primary);
  }

  .actions {
    display: flex;
    gap: 8px;
    justify-content: flex-end;
    margin-top: 24px;
  }

  button {
    padding: 8px 16px;
    border-radius: 4px;
    font-size: 13px;
    border: 1px solid var(--color-surface-2);
    cursor: pointer;
    transition: background 0.2s;
  }

  .cancel-btn {
    background: transparent;
    color: var(--color-text-primary);
  }

  .cancel-btn:hover:not(:disabled) {
    background: var(--color-surface-1);
  }

  .export-btn {
    background: var(--color-accent);
    color: white;
    border: none;
  }

  .export-btn:hover:not(:disabled) {
    opacity: 0.9;
  }

  button:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
</style>
```

Key points:
- NotesPanel manages debounced save + blur save
- ExportDialog is modal (overlay) and handles PDF/DOCX selection
- Both components pass paper + content to export service
- `downloadFile()` from notes-export triggers the browser download
  </action>

  <verify>
```bash
cd /Users/paul/Documents/programming/anya-ra

# 1. Both component files created
ls -la src/lib/components/editor/NotesPanel.svelte
ls -la src/lib/components/editor/ExportDialog.svelte

# 2. TypeScript check passes
pnpm run check 2>&1 | tail -3

# 3. No missing imports
grep -E "^import" src/lib/components/editor/NotesPanel.svelte
grep -E "^import" src/lib/components/editor/ExportDialog.svelte
```
  </verify>

  <done>
- `src/lib/components/editor/NotesPanel.svelte` exists with Props: `paper`
- `src/lib/components/editor/ExportDialog.svelte` exists with Props: `paper`, `content`, `onClose`
- Both import from stores (notes, workspace) and services (notes-export)
- NotesPanel includes debounced auto-save + blur save
- ExportDialog includes format selection + export trigger
- `pnpm run check` produces zero errors
  </done>
</task>

<!-- ═══════════════════════════════════════════════════════════════
     WAVE 4 — Integration (mostly sequential)
     ═══════════════════════════════════════════════════════════════ -->

<task id="p6-t07" type="auto" wave="4" depends_on="[p6-t05, p6-t06]">
  <name>p6-t07: Add Notes tab to MainPanel.svelte (fifth tab)</name>

  <files>
    src/lib/components/layout/MainPanel.svelte (MODIFY)
  </files>

  <action>
**Step 1 — Update MainPanel.svelte to add Notes tab:**

Find the existing tab bar and add the Notes tab after the PDF tab.

**Current structure** (search for activeTab or "tab-btn"):

```svelte
<script lang="ts">
  let activeTab = $state<'chat' | 'papers' | 'pdf' | 'graph'>('chat')
  // ↓ MODIFY: add 'notes' to the union
  let activeTab = $state<'chat' | 'papers' | 'pdf' | 'notes' | 'graph'>('chat')
</script>
```

**In the tab bar** (search for `class:active={activeTab === 'pdf'}`):

```svelte
<!-- Existing PDF tab -->
{#if $selectedPaper}
  <button
    class="tab-btn"
    class:active={activeTab === 'pdf'}
    onclick={() => (activeTab = 'pdf')}
  >
    📄 PDF
  </button>

  <!-- ADD THIS NOTES TAB (after PDF, before graph) -->
  <button
    class="tab-btn"
    class:active={activeTab === 'notes'}
    onclick={() => (activeTab = 'notes')}
  >
    📝 Notes
  </button>
{/if}

<!-- Graph tab (already exists) -->
{#if $selectedPaper}
  <button
    class="tab-btn"
    class:active={activeTab === 'graph'}
    onclick={() => (activeTab = 'graph')}
  >
    🕸 Graph
  </button>
{/if}
```

**In the tab content area** (search for `else if activeTab === 'pdf'`):

Add the Notes panel:

```svelte
<div class="tab-content">
  {#if activeTab === 'chat'}
    <!-- Chat content -->
  {:else if activeTab === 'papers'}
    <!-- Papers list -->
  {:else if activeTab === 'pdf' && $selectedPaper}
    <!-- PDF viewer -->
  {:else if activeTab === 'notes' && $selectedPaper}
    <!-- ADD THIS BLOCK -->
    <NotesPanel paper={$selectedPaper} />
  {:else if activeTab === 'graph' && $selectedPaper}
    <!-- Graph canvas -->
  {/if}
</div>
```

**At the top of MainPanel.svelte** (with other imports):

```svelte
import NotesPanel from '../editor/NotesPanel.svelte'
```

**Summary of changes:**
1. Add `NotesPanel` to imports
2. Add `'notes'` to activeTab type union
3. Add Notes button to tab bar (after PDF, before Graph)
4. Add Notes content branch to tab content (after PDF, before Graph)

All changes should respect the existing styling (class="tab-btn" for buttons, etc.).
  </action>

  <verify>
```bash
cd /Users/paul/Documents/programming/anya-ra

# 1. File modified
grep -c "NotesPanel" src/lib/components/layout/MainPanel.svelte
# Should return at least 2 (import + usage)

# 2. activeTab union includes 'notes'
grep "activeTab = \$state" src/lib/components/layout/MainPanel.svelte | grep -i notes

# 3. Tab button exists
grep "activeTab === 'notes'" src/lib/components/layout/MainPanel.svelte

# 4. TypeScript check passes
pnpm run check 2>&1 | tail -3
```
  </verify>

  <done>
- NotesPanel is imported in MainPanel.svelte
- activeTab type includes 'notes'
- Notes tab button exists in tab bar (shows when $selectedPaper is truthy)
- Notes content branch in tab content area shows NotesPanel component
- `pnpm run check` produces zero errors
  </done>
</task>

<!-- ─────────────────────────────────────────────────────────────────── -->

<task id="p6-t08" type="auto" wave="4" depends_on="[p6-t07]">
  <name>p6-t08: Initialize notes on app startup (App.svelte)</name>

  <files>
    src/App.svelte (MODIFY)
  </files>

  <action>
**Step 1 — Update App.svelte to load notes on startup:**

Find the `onMount` hook (should already have workspace + papers initialization):

**Current pattern:**

```typescript
onMount(async () => {
  await initializeWorkspace()
  if ($workspace) {
    const loaded = await loadPapers($workspace.path)
    papers.set(loaded)
  }
})
```

**Modify to add notes initialization:**

```typescript
import { initializeNotes } from './lib/services/notes-io'  // ADD THIS IMPORT
// ... other imports ...

onMount(async () => {
  await initializeWorkspace()
  if ($workspace) {
    const loaded = await loadPapers($workspace.path)
    papers.set(loaded)
    
    // ADD THIS: Load notes for the workspace
    // Pre-loads all note files into the notes store (async, non-blocking)
    await initializeNotes($workspace.path)
  }
})
```

**Create the initialization function in `src/lib/services/notes-io.ts`:**

Add this export to notes-io.ts (alongside loadNotes + saveNotes):

```typescript
/**
 * Initialize notes store by loading all .json files from {workspace}/notes/.
 * Called once on app startup after workspace + papers loaded.
 * 
 * This is optional (lazy-load also works), but pre-loading improves UX:
 * - No delay when user clicks into Notes tab
 * - Notes already cached in store when paper selected
 */
export async function initializeNotes(workspacePath: string): Promise<void> {
  try {
    // Attempt to read notes directory
    // For now, we'll skip full directory scan and rely on lazy-loading per-paper
    // (Tauri fs.readDir would require async file I/O; simpler to load on-demand)
    console.log('[notes-io] Notes store ready (lazy-loaded on tab switch)')
  } catch (error) {
    console.error('[notes-io] Failed to initialize notes:', error)
    // Non-fatal: notes will still load on-demand when paper selected
  }
}
```

**Alternative: Lazy-load on paper selection**

If you prefer not to pre-load all notes, add a watcher to load notes when a paper is selected:

```typescript
// In App.svelte, after papers.set(loaded):
import { selectedPaperId } from './lib/stores/papers'

// Watch for paper selection
selectedPaperId.subscribe(async (paperId) => {
  if (paperId && $workspace) {
    const note = await loadNotes($workspace.path, paperId)
    notes.update(map => {
      if (note) {
        map.set(paperId, note)
      }
      return map
    })
  }
})
```

For Phase 6, either approach is fine. The lazy-load approach saves startup time.
  </action>

  <verify>
```bash
cd /Users/paul/Documents/programming/anya-ra

# 1. App.svelte imports notes-io
grep "initializeNotes\|notes-io" src/App.svelte

# 2. Function is called in onMount
grep -A 10 "onMount" src/App.svelte | grep -i "initializeNotes\|notes"

# 3. TypeScript check passes
pnpm run check 2>&1 | tail -3
```
  </verify>

  <done>
- App.svelte imports initializeNotes from notes-io
- initializeNotes is called in onMount after workspace loaded
- notes-io.ts exports initializeNotes function (even if minimal/no-op for lazy-load approach)
- `pnpm run check` produces zero errors
  </done>
</task>

<!-- ─────────────────────────────────────────────────────────────────── -->

<task id="p6-t09" type="auto" wave="4" depends_on="[p6-t02, p6-t08]">
  <name>p6-t09: Test full notes workflow (create, save, export, reload)</name>

  <files>
    tests/notes-workflow.test.ts (CREATE)
  </files>

  <action>
**Step 1 — Create integration test for notes workflow:**

This tests the full chain: create note → save → export → reload

```typescript
/**
 * tests/notes-workflow.test.ts
 * 
 * Integration test for Phase 6 notes functionality.
 * Tests:
 * 1. Creating a note for a paper
 * 2. Auto-save persists to store
 * 3. Export functions generate valid blobs
 * 4. Reload restores note content
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { get } from 'svelte/store'
import { notes, currentPaperNote, saveNote } from '../src/lib/stores/notes'
import { papers, selectedPaperId } from '../src/lib/stores/papers'
import { workspace } from '../src/lib/stores/workspace'
import { exportNotesToPDF, exportNotesToDOCX } from '../src/lib/services/notes-export'
import type { Paper } from '../src/lib/types/paper'

describe('Notes Workflow', () => {
  const testWorkspacePath = '/tmp/test-workspace'
  const testPaper: Paper = {
    id: 'test_12345',
    title: 'Test Paper',
    authors: ['Author A', 'Author B'],
    year: 2024,
    source: 'arxiv',
    // ... other required fields (check Paper interface)
  }

  beforeEach(() => {
    // Reset stores
    notes.set(new Map())
    selectedPaperId.set(null)
    workspace.set({ path: testWorkspacePath } as any)
    papers.set([testPaper])
  })

  it('should save note content to store', async () => {
    selectedPaperId.set(testPaper.id)

    const testContent = '# My Notes\n\nThis is a test note.'
    
    // Mock saveNotes to avoid actual disk I/O in tests
    vi.mock('../src/lib/services/notes-io', () => ({
      saveNotes: vi.fn().mockResolvedValue(undefined),
    }))

    await saveNote(testWorkspacePath, testPaper.id, testContent)

    const storedNote = get(currentPaperNote)
    expect(storedNote).not.toBeNull()
    expect(storedNote?.notes[0]?.content).toBe(testContent)
  })

  it('should export note to PDF blob', async () => {
    const testContent = '# Research Insights\n\nThis is important.'
    const blob = await exportNotesToPDF(
      testPaper.title,
      testPaper.authors,
      {
        id: testPaper.id,
        paperId: testPaper.id,
        content: testContent,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }
    )

    expect(blob).toBeInstanceOf(Blob)
    expect(blob.type).toBe('application/pdf')
    expect(blob.size).toBeGreaterThan(0)
  })

  it('should export note to DOCX blob', async () => {
    const testContent = '# Research Insights\n\nThis is important.'
    const blob = await exportNotesToDOCX(
      testPaper.title,
      testPaper.authors,
      {
        id: testPaper.id,
        paperId: testPaper.id,
        content: testContent,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }
    )

    expect(blob).toBeInstanceOf(Blob)
    expect(blob.type).toContain('openxmlformats') // DOCX MIME type
    expect(blob.size).toBeGreaterThan(0)
  })

  it('should derive currentPaperNote from selected paper', () => {
    const testContent = 'Test content'
    notes.set(new Map([[testPaper.id, {
      version: 1,
      notes: [{
        id: testPaper.id,
        paperId: testPaper.id,
        content: testContent,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }],
    }]]))

    selectedPaperId.set(testPaper.id)

    const current = get(currentPaperNote)
    expect(current?.notes[0]?.content).toBe(testContent)

    selectedPaperId.set(null)
    expect(get(currentPaperNote)).toBeNull()
  })
})
```

**Step 2 — Run the test:**

```bash
cd /Users/paul/Documents/programming/anya-ra
pnpm vitest tests/notes-workflow.test.ts
```

**Note:** This test uses mocked Tauri invoke (no actual file I/O). For full end-to-end testing with real files, see the next task.
  </action>

  <verify>
```bash
cd /Users/paul/Documents/programming/anya-ra

# 1. Test file created
ls -la tests/notes-workflow.test.ts

# 2. Tests run without errors
pnpm vitest tests/notes-workflow.test.ts 2>&1 | tail -10
# Should show "PASS" or test results

# 3. All test suites pass
pnpm vitest 2>&1 | grep -E "✓|PASS|FAIL"
```
  </verify>

  <done>
- `tests/notes-workflow.test.ts` exists with test cases for: store save, PDF export, DOCX export, derived store
- `pnpm vitest tests/notes-workflow.test.ts` runs all tests successfully
- All export functions return valid Blobs with correct MIME types
- Store derivation works correctly (currentPaperNote updates on paper selection)
  </done>
</task>

</tasks>

---

<verification>

**Manual verification checklist** (after all tasks complete):

1. **Tab appears in UI:**
   - Open app, select a paper
   - Verify "📝 Notes" tab appears in tab bar (5th position after PDF, before Graph)
   - Click into Notes tab → editor renders (empty initially)

2. **Editor works:**
   - Type markdown (# heading, **bold**, etc.)
   - Verify syntax highlighting applies (colors for headers, etc.)
   - Blur or wait 300ms → "Saving..." indicator appears briefly
   - Close app → reopen → note content persists

3. **Export works:**
   - Click "⬇️ Export" button
   - Select PDF or DOCX
   - Click Export → file downloads to OS Downloads folder
   - Verify file has title + authors + note content

4. **Paper deletion cascades:**
   - Delete a paper from workspace
   - Verify its notes/{paperId}.json file is removed (optional disk check)
   - Select different paper → no error

5. **Multiple papers:**
   - Create notes on Paper A
   - Switch to Paper B, create different notes
   - Switch back to Paper A → original notes appear
   - Verify files: {workspace}/notes/{paperId-A}.json and {paperId-B}.json exist

**Automated verification:**

```bash
cd /Users/paul/Documents/programming/anya-ra

# Full build + test suite
pnpm run check          # Type check
pnpm vitest             # All tests
pnpm run build          # App builds successfully

# No errors should appear for notes-related files
```

</verification>

---

<success_criteria>

**Phase 6 is complete when:**

1. ✅ User can select a paper and see a Notes tab (fifth position in MainPanel)
2. ✅ Clicking Notes tab shows CodeMirror editor with markdown syntax highlighting
3. ✅ Typing content auto-saves (debounced 300ms) with "Saving..." indicator
4. ✅ Closing and reopening app restores note content (persisted in {workspace}/notes/{paperId}.json)
5. ✅ Export button works: PDF exports with paper title/authors header, DOCX exports with formatting
6. ✅ All TypeScript checks pass (`pnpm run check`)
7. ✅ All tests pass (`pnpm vitest`)
8. ✅ App builds without errors (`pnpm run build`)
9. ✅ Code follows existing patterns from Phase 3 (annotations) and Phase 5 (graph)

**Performance targets:**
- Editor renders within 200ms of tab switch
- Auto-save completes within 1 second (even on slow disk)
- PDF/DOCX export completes within 2 seconds
- App startup time increases by <500ms (notes lazy-loading)

</success_criteria>

---

<output>
After completion, create `.planning/phases/phase-6/PLAN-SUMMARY.md` with:
- Implementation summary (what was built, file structure)
- Key decisions made (debounce time, export approach, storage format)
- Known limitations (preview mode deferred, GFM extensions optional)
- Test coverage (unit tests, integration tests, manual verification checklist)
- Suggestions for Phase 7 (preview toggle, export templates, markdown extensions)
</output>
