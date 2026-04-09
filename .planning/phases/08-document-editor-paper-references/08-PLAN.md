---
phase: 08-document-editor-paper-references
plan: 1
type: execute
wave: 1
depends_on: []
files_modified:
  - src/lib/types/document.ts
  - src/lib/stores/documents.ts
  - src/lib/services/documents-io.ts
autonomous: true
requirements: [DOC-01, DOC-02, DOC-03, DOC-04, DOC-05, DOC-06, LINK-01, LINK-02, LINK-06, UX-01]

must_haves:
  truths:
    - "User can create a new document with title and initial content that persists to disk"
    - "User can open any existing document and edit its content in CodeMirror"
    - "Document changes auto-save on keystroke debounce (300ms) without manual save"
    - "User can see a live, searchable list of all documents in sidebar"
    - "User can rename and delete documents with confirmation"
    - "Referenced papers in documents are parsed and validated in real-time"
    - "Document references and metadata are stored in JSON sidecar files"
  artifacts:
    - path: "src/lib/types/document.ts"
      provides: "Document, DocumentSidecar, LinkMetadata type definitions"
    - path: "src/lib/stores/documents.ts"
      provides: "Documents store (Map<docId, content>) with auto-save debouncing"
    - path: "src/lib/services/documents-io.ts"
      provides: "Tauri I/O commands for reading/writing documents and sidecars"
  key_links:
    - from: "src/lib/stores/documents.ts"
      to: "src/lib/services/documents-io.ts"
      via: "saveDocument() calls documents-io.ts"
      pattern: "saveDocument.*invoke"
    - from: "NotesEditor.svelte (context-aware)"
      to: "src/lib/stores/documents.ts"
      via: "onChange handler calls saveDocument()"
      pattern: "onChange.*saveDocument"
    - from: "DocumentsSidebar.svelte"
      to: "src/lib/stores/documents.ts"
      via: "Store subscription for list, create, delete"
      pattern: "documents.subscribe"
---

<objective>
Create standalone document management system with title/content persistence, auto-save, and paper reference validation.

**Purpose:** Foundation for Phase 9+ to enable users to write literature reviews and reference papers with bidirectional linking.

**Output:** 
- Types: Document, DocumentSidecar, LinkMetadata
- Store: `documents` Map with debounced save
- Services: Tauri I/O for `.md` and `.links.json` files
- Components ready for Phase 2 (sidebar, editor integration)
</objective>

<execution_context>
@$HOME/.claude/get-shit-done/workflows/execute-plan.md
@$HOME/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/ROADMAP.md — Phase 8 goal, 9 success criteria, UI hints
@.planning/phases/08-CONTEXT.md — 6 locked decisions (reference syntax, storage, editor reuse, etc.)
@.planning/REQUIREMENTS.md — 9 requirements for Phase 8 (DOC-01 through DOC-06, LINK-01, LINK-02, LINK-06)
@.planning/PROJECT.md — Tech stack (Tauri v2, Svelte 5, CodeMirror 6)
@.planning/STATE.md — Prior patterns from notes store and services

**Code patterns to reuse:**
- `src/lib/stores/notes.ts` — writable Map store with debounce pattern
- `src/lib/services/notes-io.ts` — Tauri invoke pattern for load/save
- `src/lib/components/editor/NotesEditor.svelte` — CodeMirror 6 editor with onChange

**Decision references:**
- D-01: Paper reference syntax is `[cite: Paper Title]` (not `[[paper-id]]`)
- D-02: Documents managed via sidebar list (not MainPanel tab)
- D-03: Link validation is real-time (CodeMirror decorations)
- D-04: Storage is Map + sidecar pattern (like notes)
- D-05: Reuse NotesEditor with context awareness (document vs paper)
- D-06: Empty state shows template suggestions (Literature Review, Research Summary, etc.)
</context>

<tasks>

<task type="auto">
  <name>Task 1: Define document and link types</name>
  <files>src/lib/types/document.ts</files>
  <action>
Create `src/lib/types/document.ts` with TypeScript type definitions. 

This is the interface contract that downstream tasks (store, components) will implement against.

**Types to export:**

1. **Document** — Represents a document in memory
   ```typescript
   export interface Document {
     id: string
     title: string
     content: string
     createdAt: string
     updatedAt: string
   }
   ```

2. **LinkMetadata** — Single paper reference within a document
   ```typescript
   export interface LinkMetadata {
     citationText: string      // e.g., "Attention Is All You Need"
     paperId: string | null    // null if paper not found (missing)
     position: number          // character position in document content
     status: 'valid' | 'missing'
   }
   ```

3. **DocumentSidecar** — Persisted metadata for document (parallel to NotesSidecar)
   ```typescript
   export interface DocumentSidecar {
     version: number           // 1 (for future migrations)
     docId: string
     title: string
     created: string           // ISO timestamp
     modified: string          // ISO timestamp
     links: LinkMetadata[]     // All paper references in this document
   }
   ```

**Decision references:** Per D-04 (Map + sidecar pattern), D-01 (citation text validation).

**Implementation notes:**
- Use same timestamp pattern as notes (ISO string via new Date().toISOString())
- `paperId` is the key to papers store (lookup will happen in Phase 2)
- `position` tracks character offset for link highlighting (will be used by CodeMirror in Phase 2)
- `status` allows Phase 10 to mark orphaned links without deleting them
  </action>
  <verify>
    <automated>grep -E "export interface (Document|LinkMetadata|DocumentSidecar)" src/lib/types/document.ts | wc -l</automated>
    Result: Should be exactly 3 interfaces exported.
  </verify>
  <done>
Type file created with Document, LinkMetadata, DocumentSidecar exported. All 3 types match spec. File is syntactically valid TypeScript.
  </done>
</task>

<task type="auto">
  <name>Task 2: Create documents store with debounced persistence</name>
  <files>src/lib/stores/documents.ts</files>
  <action>
Create `src/lib/stores/documents.ts` following the pattern from `notes.ts`.

**Store structure:**

1. **Primary store: `documents`**
   ```typescript
   export const documents = writable<Map<string, Document>>(new Map())
   ```
   Maps docId → Document. Updated immediately on keystroke (optimistic) for UI responsiveness.

2. **Derived store: `currentDocument`** (optional, for editor context)
   ```typescript
   export const currentDocument = derived(
     [documents, selectedDocumentId],
     ([$docs, $docId]) => $docId ? $docs.get($docId) ?? null : null
   )
   ```

3. **Save function: `saveDocument(workspacePath, docId, content)`** (reuse notes pattern)
   - Updates store immediately (optimistic)
   - Creates/updates metadata: createdAt (first save only), updatedAt (every save)
   - Debounces disk write to 300ms (clear pending, schedule new)
   - Logs: `[documents] Auto-saved for {docId} at {time}`
   - Error handling: catch, log, throw (caller decides what to do)

4. **Store metadata helper: `updateDocumentMetadata(docId, title)`** (for renames)
   - Called when user renames a document
   - Updates title in memory, debounces to disk
   - Preserves content and createdAt

**Implementation details:**
- Copy debounce pattern from notes.ts exactly (pendingSave, isSaving flags)
- Use `Map.set()` and `map.get()` for store updates
- Sidecar structure: DocumentSidecar (version, docId, title, created, modified, links)
- Links array starts empty (populated in Phase 2 validation)

**Decision references:** Per D-04 (Map + sidecar pattern), per velocity lessons from v0.1.12 notes.

**Reuse from notes.ts:**
- Debounce pattern with setTimeout/clearTimeout
- Update store, then debounce I/O
- Error logging with namespace prefix [documents]
  </action>
  <verify>
    <automated>grep -E "export (const documents|async function saveDocument|async function updateDocumentMetadata)" src/lib/stores/documents.ts | wc -l</automated>
    Result: Should be 3 exports.
  </verify>
  <done>
Store created with documents Map, saveDocument() debouncer, updateDocumentMetadata() helper. Debounce pattern matches notes.ts. Store exports are correct.
  </done>
</task>

<task type="auto">
  <name>Task 3: Implement Tauri I/O commands for document persistence</name>
  <files>src/lib/services/documents-io.ts</files>
  <action>
Create `src/lib/services/documents-io.ts` that invokes Tauri backend commands.

**Functions to export:**

1. **loadDocument(workspacePath, docId): Promise<Document | null>**
   - Invokes Tauri command: `load_document`
   - Arguments: {workspacePath, docId}
   - Returns: Document parsed from {workspace}/documents/{docId}.md
   - Returns: null if file doesn't exist (new document)
   - Throws: on read error (permission, corrupt JSON)

2. **loadDocumentSidecar(workspacePath, docId): Promise<DocumentSidecar | null>**
   - Invokes Tauri command: `load_document_sidecar`
   - Returns: DocumentSidecar from {docId}.links.json
   - Returns: null if file doesn't exist
   - Throws: on read error

3. **saveDocument(workspacePath, docId, document): Promise<void>**
   - Invokes Tauri command: `save_document`
   - Arguments: {workspacePath, docId, content}
   - Creates {workspace}/documents/ directory if missing
   - Writes to {docId}.md (plain markdown, no YAML frontmatter)
   - Overwrites existing file

4. **saveDocumentSidecar(workspacePath, docId, sidecar): Promise<void>**
   - Invokes Tauri command: `save_document_sidecar`
   - Arguments: {workspacePath, docId, content (JSON string)}
   - Writes to {docId}.links.json
   - Overwrites existing file

5. **deleteDocument(workspacePath, docId): Promise<void>**
   - Invokes Tauri command: `delete_document`
   - Deletes both {docId}.md and {docId}.links.json
   - Returns silently if file doesn't exist
   - Throws: on permission error

6. **listDocuments(workspacePath): Promise<string[]>**
   - Invokes Tauri command: `list_documents`
   - Returns: Array of docIds found in {workspace}/documents/ (strip .md extension)
   - Empty array if directory doesn't exist

7. **renameDocument(workspacePath, oldDocId, newDocId): Promise<void>**
   - Invokes Tauri command: `rename_document`
   - Renames {oldDocId}.md and {oldDocId}.links.json
   - Returns silently if files don't exist

**Implementation notes:**
- Copy error handling pattern from notes-io.ts (check error.message for 'not found')
- Use `JSON.stringify(sidecar, null, 2)` for readable JSON
- All throw on error (caller handles via try/catch in store)
- Namespace prefix: [documents-io]

**What NOT to implement:** 
- Do NOT create a document if it doesn't exist (store handles creation)
- Do NOT validate content (store handles validation in Phase 2)
- Do NOT update any other files or state (these are I/O-only)

**Decision references:** Per D-04 (Map + sidecar pattern), per file structure spec in CONTEXT.md.
  </action>
  <verify>
    <automated>grep -E "export (async function|const)" src/lib/services/documents-io.ts | wc -l</automated>
    Result: Should be 6 async functions exported.
  </verify>
  <done>
I/O service created with loadDocument, loadDocumentSidecar, saveDocument, saveDocumentSidecar, deleteDocument, listDocuments, renameDocument. Error patterns match notes-io. All commands are Tauri invoke calls with correct arguments.
  </done>
</task>

</tasks>

<verification>
**Wave 1 verification checklist:**

1. Type definitions (Task 1)
   - [ ] Document interface has id, title, content, createdAt, updatedAt
   - [ ] LinkMetadata has citationText, paperId, position, status
   - [ ] DocumentSidecar has version, docId, title, created, modified, links array
   - [ ] All three types exported and compilable

2. Documents store (Task 2)
   - [ ] `documents` Map store created and exported
   - [ ] `saveDocument()` function debounces to 300ms
   - [ ] Debounce pattern matches notes.ts (pendingSave, isSaving flags)
   - [ ] Store update is optimistic (immediate), I/O is debounced
   - [ ] Error logging uses [documents] prefix
   - [ ] updateDocumentMetadata() helper exists (for renames in Phase 2)

3. Documents I/O service (Task 3)
   - [ ] 7 async functions exported
   - [ ] loadDocument, loadDocumentSidecar return null on file-not-found
   - [ ] saveDocument, saveDocumentSidecar invoke Tauri commands
   - [ ] deleteDocument removes both .md and .links.json
   - [ ] listDocuments returns docIds only (no file extensions)
   - [ ] renameDocument renames both files atomically
   - [ ] Error handling matches notes-io pattern

**Post-Wave 1 status:**
- All three type/store/service files created
- No UI components yet (Wave 2)
- No Tauri backend yet (separate Rust implementation)
- Ready for Phase 2 (sidebar, editor integration, validation)
</verification>

<success_criteria>
Phase 8 (Wave 1) complete when:
- [ ] `src/lib/types/document.ts` exists with Document, LinkMetadata, DocumentSidecar types
- [ ] `src/lib/stores/documents.ts` exists with documents Map, saveDocument() debouncer
- [ ] `src/lib/services/documents-io.ts` exists with 7 I/O functions
- [ ] All files compile without TypeScript errors
- [ ] Debounce pattern in saveDocument() matches notes.ts pattern
- [ ] All types are properly exported and can be imported in other files
- [ ] Store follows established patterns from notes.ts (Map, debounce, optimistic update)

**What's NOT verified in Wave 1:** Actual file I/O (requires Rust backend), editor integration, UI. Those are Waves 2-3.
</success_criteria>

<output>
After completion, create `.planning/phases/08-document-editor-paper-references/08-01-SUMMARY.md` containing:
- Artifacts created (file paths, what each provides)
- Errors encountered and how resolved
- Open dependencies (Rust backend Tauri commands, Phase 2 components)
- Estimated remaining work for Phase 8 (Wave 2-3)
</output>
