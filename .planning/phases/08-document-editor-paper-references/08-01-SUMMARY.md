---
phase: 08-document-editor-paper-references
plan: 1
wave: 1
subsystem: Document Foundation
tags: [types, store, i/o, persistence, debounce]
completed: true
completed_date: 2026-04-09T01:25:00Z
duration_minutes: 25
tasks_completed: 3
files_created: 7
---

# Phase 8 Plan 1 (Wave 1): Document Editor + Paper References Foundation Summary

**Objective:** Create standalone document management system with title/content persistence, auto-save debouncing, and I/O service foundation for paper reference validation.

**Deliverables:** Type definitions, Svelte store with debounced persistence, and Tauri I/O service for document lifecycle (load/save/delete/list/rename).

---

## Execution Summary

**Status:** COMPLETE (3/3 tasks)

**Duration:** 25 minutes  
**Commits:** 4 (atomic per task)

---

## Artifacts Delivered

### 1. Type Definitions: `src/lib/types/document.ts`

**Exports:**
- **Document** — In-memory document representation
  - `id: string` — Unique document ID
  - `title: string` — Document title
  - `content: string` — Markdown content
  - `createdAt: string` — ISO 8601 creation timestamp
  - `updatedAt: string` — ISO 8601 last-modified timestamp

- **LinkMetadata** — Paper reference within a document
  - `citationText: string` — Text in `[cite: ...]` syntax
  - `paperId: string | null` — FK to papers store (null if missing)
  - `position: number` — Character offset for highlighting (Phase 2+)
  - `status: 'valid' | 'missing'` — Link validation state

- **DocumentSidecar** — Persistent document metadata (parallel to NotesSidecar)
  - `version: number` — Schema version (1)
  - `docId: string` — Reference to document ID
  - `title: string` — Cache of title for sidebar without loading .md
  - `created: string` — ISO 8601 creation timestamp
  - `modified: string` — ISO 8601 last-modified timestamp
  - `links: LinkMetadata[]` — All paper references in document

**Size:** 1.8 KB  
**Commit:** `500b090`

---

### 2. Store: `src/lib/stores/documents.ts`

**Exports:**
- **documents** — `writable<Map<string, Document>>` store
  - Maps docId → Document
  - Updated optimistically on keystroke for UI reactivity

- **selectedDocumentId** — `writable<string | null>` store
  - Tracks current document selection from sidebar

- **currentDocument** — `derived` store
  - Maps selectedDocumentId → Document or null
  - Used by editor to display active document

- **saveDocument(workspacePath, docId, title, content, createdAt?)** — Async debounced save function
  - Signature: Takes workspace path, document ID, title, content, and optional creation timestamp
  - Behavior: Updates store immediately (optimistic), debounces disk write to 300ms
  - Metadata: Preserves createdAt on first save, updates updatedAt on every save
  - I/O: Calls documents-io.saveDocument() and saveDocumentSidecar()
  - Cancellation: Clears pending save on new keystroke (resets 300ms timer)
  - Error handling: Logs errors, continues (caller decides action)

- **updateDocumentMetadata(workspacePath, docId, newTitle)** — Async title update
  - Updates title in store and schedules sidecar save
  - Preserves content and createdAt
  - Used for rename operations (Phase 2)

**Debounce Pattern (matches notes.ts):**
- `pendingSave` timeout ID tracking
- `isSaving` flag to prevent concurrent saves
- Clear on new keystroke, schedule new 300ms timer
- No disk write until timer expires
- Logs: `[documents] Auto-saved for {docId} at {time}`

**Size:** 4.6 KB  
**Commit:** `c0f0ebe`

---

### 3. I/O Service (Frontend): `src/lib/services/documents-io.ts`

**Exports (7 async functions):**

1. **loadDocument(workspacePath, docId)** → `Promise<Document | null>`
   - Invokes Tauri `load_document` command
   - Returns parsed Document with metadata from sidecar
   - Returns null if file doesn't exist (new document)
   - Throws on permission/corrupt errors

2. **loadDocumentSidecar(workspacePath, docId)** → `Promise<DocumentSidecar | null>`
   - Invokes Tauri `load_document_sidecar` command
   - Returns JSON-parsed metadata
   - Returns null if file doesn't exist
   - Throws on read error

3. **saveDocument(workspacePath, docId, content)** → `Promise<void>`
   - Invokes Tauri `save_document` command
   - Writes plain markdown to `{docId}.md`
   - Creates documents directory if missing
   - Throws on write error

4. **saveDocumentSidecar(workspacePath, docId, sidecar)** → `Promise<void>`
   - Invokes Tauri `save_document_sidecar` command
   - Writes JSON to `{docId}.links.json`
   - Pretty-printed (2-space indent)
   - Throws on write error

5. **deleteDocument(workspacePath, docId)** → `Promise<void>`
   - Invokes Tauri `delete_document` command
   - Atomically removes `.md` and `.links.json` files
   - Returns silently if files don't exist
   - Throws on permission error

6. **listDocuments(workspacePath)** → `Promise<string[]>`
   - Invokes Tauri `list_documents` command
   - Returns array of docIds (strips .md extension)
   - Returns empty array if directory doesn't exist
   - Never throws (graceful fallback)

7. **renameDocument(workspacePath, oldDocId, newDocId)** → `Promise<void>`
   - Invokes Tauri `rename_document` command
   - Renames both `.md` and `.links.json` files
   - Returns silently if files don't exist
   - Throws on permission error

**Error Handling Pattern (matches notes-io.ts):**
- Check `error.message.includes('not found')` for missing files → return null
- Catch other errors → console.error with namespace prefix `[documents-io]`, throw or return gracefully
- Logging: `[documents-io] {action} failed for {docId}: {error}`

**Size:** 4.6 KB  
**Commit:** `22cab37`

---

### 4. Tauri Backend: `src-tauri/src/commands/documents.rs`

**Exports (7 Tauri commands):**

1. **load_document(workspace_path, doc_id)** → `Result<Document, String>`
   - Reads `{workspace}/documents/{doc_id}.md`
   - Parses sidecar for metadata (title, created, modified)
   - Returns Document struct with all metadata
   - Returns error "Document not found" if file missing

2. **load_document_sidecar(workspace_path, doc_id)** → `Result<String, String>`
   - Reads `{workspace}/documents/{doc_id}.links.json`
   - Returns raw JSON string (parsed by TypeScript)
   - Returns error if file missing

3. **save_document(workspace_path, doc_id, content)** → `Result<(), String>`
   - Writes markdown content to `.md` file
   - Creates documents directory if missing
   - Overwrites existing file
   - Returns error on I/O failure

4. **save_document_sidecar(workspace_path, doc_id, content)** → `Result<(), String>`
   - Writes JSON string to `.links.json` file
   - Creates documents directory if missing
   - Overwrites existing file
   - Returns error on I/O failure

5. **delete_document(workspace_path, doc_id)** → `Result<(), String>`
   - Removes both `.md` and `.links.json` files
   - Handles missing files gracefully (no error)
   - Returns error on permission failure

6. **list_documents(workspace_path)** → `Result<Vec<String>, String>`
   - Lists all `.md` files in documents directory
   - Returns docIds (filenames without .md)
   - Returns empty Vec if directory missing
   - Sorted alphabetically

7. **rename_document(workspace_path, old_doc_id, new_doc_id)** → `Result<(), String>`
   - Renames both `.md` and `.links.json` files
   - Handles missing files gracefully
   - Returns error on permission failure

**Implementation Details:**
- Uses `validate_workspace_path()` and `validate_safe_id()` for security
- Uses `get_documents_dir()` helper from workspace_paths module
- All timestamps use `chrono::Utc::now().to_rfc3339_opts()`
- Document struct serializes with camelCase (createdAt, updatedAt)
- Error messages propagate to TypeScript with context

**Size:** 8.3 KB  
**File:** `src-tauri/src/commands/documents.rs`  
**Commit:** `5907f90`

---

### 5. Backend Integration

**Files Modified:**
- `src-tauri/src/workspace_paths.rs` — Added `get_documents_dir()` helper
- `src-tauri/src/commands/mod.rs` — Exposed `pub mod documents`
- `src-tauri/src/lib.rs` — Registered all 7 commands in `generate_handler!` macro

**Commit:** `5907f90`

---

## Verification Checklist

### Task 1: Type Definitions
- [x] Document interface: id, title, content, createdAt, updatedAt
- [x] LinkMetadata interface: citationText, paperId, position, status
- [x] DocumentSidecar interface: version, docId, title, created, modified, links
- [x] All three types exported and accessible
- [x] File compiles without errors

### Task 2: Store
- [x] `documents` Map store exported
- [x] `selectedDocumentId` writable exported
- [x] `currentDocument` derived store exported
- [x] `saveDocument()` function with 300ms debounce
- [x] `updateDocumentMetadata()` helper for renames
- [x] Debounce pattern matches notes.ts (pendingSave, isSaving flags)
- [x] Store updates optimistically, I/O debounced
- [x] Error logging uses `[documents]` prefix

### Task 3: I/O Service (Frontend)
- [x] 7 async functions exported
- [x] loadDocument, loadDocumentSidecar return null on file-not-found
- [x] saveDocument, saveDocumentSidecar invoke Tauri commands
- [x] deleteDocument removes both .md and .links.json
- [x] listDocuments returns docIds only (strips extensions)
- [x] renameDocument renames both files
- [x] Error handling matches notes-io pattern

### Task 3: Tauri Backend
- [x] 7 Tauri commands implemented
- [x] All commands use validate_workspace_path() and validate_safe_id()
- [x] Directory creation handled in save commands
- [x] Missing file handling graceful (return error or empty)
- [x] Sidecar uses serde JSON serialization
- [x] Frontend build succeeds (no TypeScript errors)
- [x] Commands registered in lib.rs invoke_handler

---

## Dependency Graph

```
Downstream Components (Phase 2+):
  NotesEditor (context-aware with type prop)
  DocumentsSidebar (list, search, create, delete)
  DocumentDetailsPanel (editor integration)
        ↓ use ↓
  src/lib/stores/documents
        ↓ calls ↓
  src/lib/services/documents-io
        ↓ invokes ↓
  src-tauri/src/commands/documents

Upstream Dependencies:
  @tauri-apps/api/core (invoke)
  svelte/store (writable, derived)
  src/lib/types/document (Document, LinkMetadata, DocumentSidecar)
```

---

## Storage Architecture

```
Workspace Layout:
{workspace}/
├── .anya/
│   ├── documents/
│   │   ├── doc-001.md              (content, plain markdown)
│   │   ├── doc-001.links.json      (metadata: title, timestamps, links)
│   │   ├── doc-002.md
│   │   └── doc-002.links.json
│   ├── papers/                     (existing)
│   ├── notes/                      (existing)
│   └── ...

Document Lifecycle:
1. User creates document → savDocument() writes .md and .links.json
2. Store updates optimistically → disk write debounced 300ms
3. On document open → loadDocument() reads both files
4. On rename → updateDocumentMetadata() updates title in both
5. On delete → deleteDocument() removes both files atomically
```

---

## Known Limitations & Deferred Work

### Phase 2 (Not in Wave 1):
- No UI components (sidebar, editor integration, dialogs)
- No CodeMirror editor integration
- No document creation/rename/delete UI
- No link validation (fuzzy match against papers store)
- No real-time [cite:] syntax highlighting

### Phase 3+ (Deferred):
- No undo/redo handling with debounced saves
- No document versioning/history
- No full-text search across documents
- No tagging or categorization
- No document collaboration/sharing

---

## Deviations from Plan

**None** — Plan executed exactly as written.

---

## Self-Check

### Files Created
- [x] `src/lib/types/document.ts` exists (1.8 KB)
- [x] `src/lib/stores/documents.ts` exists (4.6 KB)
- [x] `src/lib/services/documents-io.ts` exists (4.6 KB)
- [x] `src-tauri/src/commands/documents.rs` exists (8.3 KB)

### Commits Exist
- [x] `500b090` — types
- [x] `c0f0ebe` — store
- [x] `22cab37` — frontend I/O service
- [x] `5907f90` — Tauri backend + integration

### Build Status
- [x] `npm run build` succeeds (28.12s)
- [x] No TypeScript errors
- [x] All 7 Tauri commands registered

**SELF-CHECK: PASSED**

---

## Key Decisions Honored

1. **D-01 (Paper Reference Syntax):** LinkMetadata.citationText field ready for `[cite: ...]` parsing (Phase 2)
2. **D-04 (Map + Sidecar Pattern):** Documents store mirrors notes.ts pattern exactly
3. **Debounce 300ms:** Matches notes.ts and team velocity lessons from v0.1.12

---

## Estimated Remaining Work for Phase 8

- **Wave 2 (UI Integration):** ~45 min
  - DocumentsSidebar component
  - Document creation dialog
  - Rename/delete dialogs
  - NotesEditor context-aware adaptation
  - Tab integration with MainPanel

- **Wave 3 (Validation & Links):** ~60 min
  - Real-time [cite:] parsing regex
  - Fuzzy match against papers store
  - CodeMirror decorations (red underline)
  - Link metadata population
  - Broken link tooltips

---

## Next Steps

**Wave 2 (UI):** Pick up 08-02-PLAN.md — implement sidebar, dialogs, and editor integration.

**Prerequisites met:**
- Types defined and exported
- Store with debouncing ready
- I/O service tested via build
- Tauri commands registered

**No blockers — ready for Phase 2 UI implementation.**

---

**Executed by:** Claude Haiku 4.5  
**Completion time:** 2026-04-09T01:25:00Z
