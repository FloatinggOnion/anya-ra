---
phase: 8
phase_name: Document Editor + Paper References
phase_goal: Users can create, persist, edit documents AND reference papers within documents with bidirectional link tracking.
created: 2026-04-08
status: discussion_complete
---

# Phase 8 Context: Document Editor + Paper References

## Phase Overview

Phase 8 is the foundation for v0.2.0's enhanced writing experience. It establishes:
1. Standalone document creation/editing (literature reviews, research summaries, reading notes)
2. Paper referencing within documents using `[cite: Paper Title]` syntax
3. Real-time link validation with visual feedback
4. Bidirectional link storage and backlink capability (prepared for Phase 10)

**Success criteria (from ROADMAP.md):**
- User can create, open, persist, and manage documents
- Auto-save on keystroke debounce (300ms)
- Real-time `[cite: Paper Title]` validation with visual feedback
- Paper references stored in JSON sidecar, persistent across sessions

---

## Locked Decisions

### 1. Paper Reference Syntax: `[cite: Paper Title]`

**Decision:** Users reference papers using `[cite: Paper Title]` format.

**Rationale:**
- Citation-style syntax is recognizable and less visual weight than Obsidian's `[[]]`
- Using paper **title** instead of ID is more intuitive while writing (users think about papers by title, not ID)
- Easier for discoverability (users don't need to memorize paper IDs)

**Implementation notes:**
- Parser: Regex to extract `[cite: (.+?)]` and validate against papers store
- Validation: Real-time fuzzy match against paper titles in papers store
- On missing paper: Show red underline/inline warning
- Link target: Maps citation to paper ID for backlinks

**Example:** User writes "As noted [cite: Attention Is All You Need], transformers..."
→ System validates that "Attention Is All You Need" exists in papers store
→ If missing: red underline with inline hint "Paper not found"
→ If found: link is stored with paper ID in `.links.json`

---

### 2. Document Organization: Sidebar List

**Decision:** Documents are discovered and managed via a searchable sidebar list (not a MainPanel tab).

**Rationale:**
- Keeps document list always accessible without claiming a whole tab
- Parallel to how Papers/Notes are organized (familiar pattern)
- Sidebar search/filter lets users quickly find documents by title
- Click document in sidebar → opens editor

**Implementation notes:**
- Sidebar component similar to Papers sidebar (list, search, create button)
- Click document → switches editor context (see Decision 5)
- Document list is alphabetical by default, searchable
- "+" button to create new document

**User flow:**
1. Click "+" in Documents sidebar → new document dialog
2. Enter title → document created and editor opens
3. User writes, editor auto-saves (300ms debounce)
4. Click another document → sidebar switches editor context
5. Search to find old documents by title

---

### 3. Link Validation Timing: Real-Time

**Decision:** Paper references are validated in real-time as the user types, with immediate visual feedback.

**Rationale:**
- Keeps writer in flow (they see immediately if a reference is broken)
- Prevents "silent" broken links (user finds out on save, could be frustrating)
- Real-time validation is less noisy than constant checking because it only highlights the specific `[cite: ...]` that's broken

**Implementation notes:**
- Use CodeMirror 6 decorations to underline broken references in red
- Validation triggered on content change (debounced, ~100ms)
- Check against papers store: fuzzy match on title
- If no match: red underline + tooltip "Paper not found"
- If match: remove underline, store paper ID for link metadata

**Visual feedback:**
- Broken: `[cite: Unknown Paper]` → red wavy underline
- Valid: `[cite: Attention Is All You Need]` → no underline
- Hover broken ref → "Paper not found. Did you mean...?" (with suggestions)

---

### 4. Document Storage: Map + Sidecar Pattern

**Decision:** Documents stored as Map<docId, content> in Svelte store, persisted to disk as `{docId}.md` + `{docId}.links.json`.

**Rationale:**
- **Consistency:** Notes already use this proven pattern; documents follow the same convention
- **Reusability:** Leverage existing debounced save logic from notes-io service
- **Low risk:** Pattern is validated in production; no new code needed for persistence
- **Clean separation:** Content (markdown) separate from metadata (links, timestamps)
- **Performance:** Updating just the links (Phase 10 delete protection) doesn't require rewriting the entire document

**Storage structure:**
```
{workspace}/documents/
├── doc-001-my-review.md          (content, plain markdown)
├── doc-001-my-review.links.json  (metadata: paper refs, created, modified)
├── doc-002-notes.md
└── doc-002-notes.links.json
```

**Example `.links.json`:**
```json
{
  "docId": "doc-001",
  "title": "My Literature Review",
  "created": "2026-04-08T10:00:00Z",
  "modified": "2026-04-08T12:30:00Z",
  "links": [
    {
      "citationText": "Attention Is All You Need",
      "paperId": "arxiv_1706.03762",
      "position": 142,
      "status": "valid"
    },
    {
      "citationText": "BERT Model",
      "paperId": null,
      "position": 456,
      "status": "missing"
    }
  ]
}
```

**Implementation pattern (reuse from notes):**
```typescript
// Svelte store
export const documents = writable<Map<string, DocumentContent>>(new Map())

// Debounced save (reuse saveNote pattern)
export async function saveDocument(
  workspacePath: string,
  docId: string,
  content: string
): Promise<void> {
  // Clear pending save, update store optimistically, debounce disk write
}
```

---

### 5. Editor Integration: Context-Aware NotesEditor Reuse

**Decision:** Reuse the existing NotesEditor component (CodeMirror 6) with context-aware switching between document and paper notes content.

**Rationale:**
- **No tab bloat:** MainPanel has 5 tabs (Chat, Papers, PDF, Graph, Notes). Adding a 6th is crowded
- **Proven component:** NotesEditor already works; reuse beats duplication
- **Context is clear:** Sidebar shows which document/paper is selected. When user clicks a document, the editor switches context
- **Single source of truth:** One editor to maintain, improve, and extend (Phase 9 inline suggestions will benefit)
- **Familiar UX:** Users already know NotesEditor; same component, different data source

**How it works:**
```typescript
// NotesEditor component becomes context-aware
// Props: {type: 'document'|'paper', id: docId|paperId, content: string}

// When user clicks document in sidebar:
NotesEditor(type="document", id="doc-001", content="...")

// When user clicks paper:
NotesEditor(type="paper", id="arxiv_1706", content="...")
```

**User experience:**
- Sidebar shows Documents + Papers sections
- Click document → editor shows document content, with **Documents sidebar context**
- Click paper → editor shows paper's notes, with **Papers sidebar context**
- Visual indicator in editor header ("Editing: My Literature Review" vs "Editing notes for: Attention Is All You Need")

**Implementation notes:**
- Add `type` and `id` props to NotesEditor
- Route to correct store based on type (documents store vs notes store)
- Auto-save calls correct persistence function (saveDocument vs saveNote)
- Link validation in editor only runs for documents (Paper Title citations only matter in documents)

---

### 6. Empty State UX: Helpful Onboarding + Template Suggestions

**Decision:** When a workspace has no documents, show helpful onboarding text + template suggestions to guide document creation.

**Rationale:**
- **Helpful text** educates users on what documents are for
- **Templates** guide structure without forcing it (user can always choose blank)
- **Mix** balances guidance with flexibility

**Visual design (sidebar when no documents):**
```
📝 Documents

  Start your first literature review.
  Choose a structure or create blank:

  📋 Literature Review
  📝 Research Summary
  📚 Reading Notes
  ➕ Blank Document
```

**Template suggestions (what each creates):**
- **Literature Review** — Title + empty content, pre-populated header structure
- **Research Summary** — Title + "Summary:" prefix, ready to fill in
- **Reading Notes** — Title + timestamp, encourages dated notes
- **Blank Document** — Just title + empty content

**Implementation:**
- Clicking a template creates a document with that title pattern + optional pre-filled content
- All templates are just initial content (user can delete/modify immediately)
- No "locked" template structure (users are free to ignore it)

---

## Claude's Discretion (Not Locked)

These are areas where the planner can decide without asking the user again:

1. **Document ID format** — `doc-001`, `doc-UUID`, or human-readable slug? Planner chooses.
2. **Sidebar sorting** — Alphabetical, creation order, or last-modified? Planner chooses (default: alphabetical).
3. **Search algorithm** — Exact match or fuzzy? Planner decides.
4. **Template content** — Exact wording of pre-filled content for each template. Planner can write engaging defaults.
5. **Link tooltip behavior** — What appears when user hovers a broken link? Planner designs UX.
6. **Undo/redo with auto-save** — How should undo interact with the debounced save? Planner decides.

---

## Deferred Ideas

These were mentioned during discussion but are out of scope for Phase 8:

- **Document templates with AI generation** — Too close to full automation (conflicts with "assist, not automate" principle)
- **Document versioning/history** — Could be useful, but is its own feature (defer to v0.3+)
- **Comments/annotations on documents** — Could be interesting, but is separate scope (defer)
- **Document collaboration/sharing** — Out of scope (local-first architecture)
- **Advanced citing (BibTeX, CSL formats)** — For now, just paper ID + title. Defer citation styles.

---

## What's NOT in Scope

- **Paper discovery or import** — Phase 8 assumes papers already exist in workspace (handled by earlier phases or user import)
- **Backlinks display** — That's Phase 10 (Backlinks UI + Link Safeguards)
- **Link creation UI** — User types citations manually; no "insert citation" button (could be added later)
- **Full-text search across documents** — Sidebar search by title only
- **Document tagging/categorization** — Just a flat list for now

---

## Downstream Guidance

### For gsd-phase-researcher (Phase 8 research):

Research these with the above decisions in mind:

1. **CodeMirror 6 decoration API** — How to render red underlines for broken refs in real-time?
2. **Fuzzy matching libraries** — What's the best way to match user-typed "Attention Is All You Need" against exact paper titles in the papers store?
3. **Svelte store patterns** — Reuse from notes-io and chat-persistence; adapt for documents
4. **File I/O patterns** — Tauri commands for reading/writing `.md` and `.links.json` files
5. **Sidebar component patterns** — Reuse from Papers/Notes sidebar implementation

### For gsd-planner (Phase 8 planning):

With the above decisions locked, plan:

1. **DocumentsStore** — Svelte store mirroring notes pattern
2. **DocumentsService** — CRUD operations (create, read, update, delete)
3. **documentsIO** — Tauri commands for persistence (read/write `.md` and `.links.json`)
4. **DocumentReferencesValidator** — Real-time validation logic (fuzzy match citations against papers store)
5. **DocumentsSidebar** — UI component (list, search, create, empty state with templates)
6. **NotesEditor adaptation** — Modify NotesEditor to accept context type (document vs paper)
7. **LinkMetadata type** — Structure for `.links.json` files

**Phase completeness check:** All 9 success criteria from ROADMAP.md must be met before Phase 9 starts.

---

## Questions for Planner

If any of these come up during planning, the planner can decide:

- Should document creation open the editor immediately, or show a dialog first?
- When user renames a document, should the filename change (`doc-001-old.md` → `doc-001-new.md`)?
- Should deleting a document move it to trash first, or permanently delete?
- Should there be a "recent documents" list in addition to "all documents"?

---

*Last updated: 2026-04-08 after discussion with user*
*Ready for Phase 8 research and planning*
