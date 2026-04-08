# v0.2.0 Requirements: Enhanced Interactive Writing with AI Assistance

**Milestone:** v0.2.0  
**Version:** v0.2.0  
**Status:** Defining requirements  

---

## Requirements by Category

### Document Management (DOC)

- [ ] **DOC-01**: User can create a new standalone literature review document (title, initial content)
- [ ] **DOC-02**: User can open/edit existing documents (persisted in `{workspace}/documents/{docId}.md`)
- [ ] **DOC-03**: User can delete documents (with confirmation dialog)
- [ ] **DOC-04**: Document state auto-saves on blur/keystroke debounce (300ms)
- [ ] **DOC-05**: User can see list of all documents in sidebar (filterable by title)
- [ ] **DOC-06**: User can rename/retitle documents in-place

### Paper References & Linking (LINK)

- [ ] **LINK-01**: User can reference papers within document using `[[paper-id]]` syntax
- [ ] **LINK-02**: Referenced papers are validated (alert if paper doesn't exist)
- [ ] **LINK-03**: User can see backlinks: "This paper is referenced in X documents"
- [ ] **LINK-04**: Clicking paper reference opens paper detail panel (or jumps to paper in sidebar)
- [ ] **LINK-05**: Deleting a paper marks its references as "missing" (orphan handling)
- [ ] **LINK-06**: Links are stored in JSON sidecar (`.links.json`) alongside document

### Inline Suggestions (SUGG)

- [ ] **SUGG-01**: When user is idle (no keystroke for 500ms) while editing, generate writing suggestion
- [ ] **SUGG-02**: Suggestions are context-aware: use selected papers + current document section
- [ ] **SUGG-03**: Suggestion appears as ghost text (grayed out) inline without blocking text
- [ ] **SUGG-04**: User can accept suggestion (Tab key), reject (Escape), or edit before accepting
- [ ] **SUGG-05**: Accepted suggestion is committed to document; rejected suggestion is discarded
- [ ] **SUGG-06**: Suggestion generation happens via Ollama/OpenAI (uses existing LLM integration)
- [ ] **SUGG-07**: Show loading indicator if suggestion takes >1s to generate
- [ ] **SUGG-08**: User can select papers/notes as context for suggestions (via chat context pane)

### Export (EXP)

- [ ] **EXP-01**: User can export document to PDF (with title, metadata, paper references list)
- [ ] **EXP-02**: PDF includes list of referenced papers as appendix (title, authors, year, link)
- [ ] **EXP-03**: Export dialog allows user to choose: full PDF, markdown only, or with references

### Editor Experience (UX)

- [ ] **UX-01**: Literature review documents use same CodeMirror editor as notes (consistent UI)
- [ ] **UX-02**: Document tab appears in MainPanel when user creates/opens a document
- [ ] **UX-03**: Paper references are styled distinctly (highlight color or underline)
- [ ] **UX-04**: Chat context pane shows "Selected for suggestions" indicator (papers/notes being used)

---

## Future Requirements (v0.3+)

- [ ] Document templates (methodology, findings, conclusion sections)
- [ ] Full LaTeX export with proper bibliography
- [ ] Document version history / branching
- [ ] Real-time multi-user collaboration
- [ ] Document outline / table of contents
- [ ] Advanced search across documents

---

## Out of Scope

- **Full document generation** — LLM assists, never generates full reviews
- **Automatic linking** — Manual references are more intentional and editable
- **Relation databases** — Keep links simple (JSON sidecars, not SQLite)
- **Document templates with AI generation** — Too close to full automation
- **Citation styles** — Future (for now, just paper ID + metadata)

---

## Traceability

| REQ-ID | Category | Phase | Status |
|--------|----------|-------|--------|
| DOC-01 to DOC-06 | Document Management | 1 | Planned |
| LINK-01 to LINK-06 | Paper References | 1 | Planned |
| SUGG-01 to SUGG-08 | Inline Suggestions | 2 | Planned |
| EXP-01 to EXP-03 | Export | 3 | Planned |
| UX-01 to UX-04 | Editor Experience | 1 | Planned |

---

**Total v0.2.0 Requirements:** 27 REQ-IDs  
**Last updated:** 2026-04-08
