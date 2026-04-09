---
gsd_roadmap_version: 1.0
milestone: v0.2.0
milestone_name: Enhanced Interactive Writing
total_phases: 4
start_phase: 8
end_phase: 11
status: ready_for_execution
created: "2026-04-08T20:35:00.000Z"
last_updated: "2026-04-09T14:20:00.000Z"
---

# ROADMAP.md - v0.2.0: Enhanced Interactive Writing with AI Assistance

**Milestone:** v0.2.0  
**Status:** Ready for execution  
**Total Phases:** 4  
**Requirements Coverage:** 27/27 ✓  
**Granularity:** Standard  

**Restructured based on pitfall analysis:** Document editor + links foundation first, then conservative suggestions with latency benchmarks, then backlinks UI with safeguards.

---

## Phases Overview

- [ ] **Phase 8: Document Editor + Paper References** - Create, persist, edit documents and implement `[cite: Paper Title]` reference syntax with validation
- [ ] **Phase 9: Conservative Inline Suggestions** - Context-aware AI writing assistance with 1-suggestion-max policy, <150ms latency SLA, multi-provider LLM support (Ollama + OpenAI + OpenRouter)
- [ ] **Phase 10: Backlinks UI + Link Safeguards** - Backlink discovery, delete protection, visual density limits, measurement dashboards
- [ ] **Phase 11: Export & Polish** - PDF export with metadata, references appendix, and final refinements

---

## Phase Details

### Phase 8: Document Editor + Paper References

**Goal:** Users can create, persist, edit documents AND reference papers within documents with bidirectional link tracking.

**Depends on:** Nothing (foundation phase)

**Requirements:** DOC-01 through DOC-06, LINK-01 through LINK-06, UX-01, UX-02, UX-03

**Success Criteria** (what must be TRUE when phase completes):
  1. User can create a new document with title and initial content; document is persisted to `{workspace}/documents/{docId}.md`
  2. User can open any existing document from sidebar list and edit content in CodeMirror editor
  3. Document changes auto-save on keystroke debounce (300ms) without user intervention
  4. User can see live list of all documents in sidebar (filterable by title)
  5. User can rename documents in-place and delete documents with confirmation dialog
  6. Document tab appears in MainPanel when user creates/opens a document, matching the existing notes/papers editor style
  7. User can create paper references in document using `[cite: Paper Title]` syntax; references are parsed and validated
  8. If referenced paper doesn't exist, an alert/inline warning appears indicating the missing reference
  9. Referenced papers are stored in JSON sidecar file (`{docId}.links.json`), loaded on document open, and persisted with document

**Plans:** 3 plans (12 tasks total, 3 waves)
  - [ ] 08-01-PLAN.md — Foundation (types, store, I/O service) — Wave 1
  - [ ] 08-02-PLAN.md — UI integration (sidebar, editor, dialog, tabs) — Wave 2
  - [ ] 08-03-PLAN.md — Validation & links (citation parsing, fuzzy match, decorations) — Wave 3

**UI hint:** yes

---

### Phase 9: Conservative Inline Suggestions

**Goal:** Users receive real-time, context-aware writing suggestions with high quality, low latency, and multi-provider LLM support (Ollama + OpenAI + OpenRouter).

**Depends on:** Phase 8

**Requirements:** SUGG-01 through SUGG-08, UX-04, plus NEW LLM-MULTI-01 through LLM-MULTI-03

**Critical Constraint:** Suggestion latency p95 < 300ms (p50 < 150ms preferred). If latency exceeds 300ms in Week 1 benchmark, defer to v0.2.1.

**Success Criteria** (what must be TRUE when phase completes):
  1. LLM provider abstraction supports Ollama, OpenAI, and OpenRouter as interchangeable backends
  2. User can configure LLM provider via settings dialog (with fallback chain: try primary → fallback → error)
  3. When user stops typing for 500ms while editing a document, ONE suggestion (max) is generated using selected papers and document section as context
  4. Suggestion context budget limited to 500 tokens (papers + document section); use js-tiktoken to validate before LLM call
  5. Suggestion appears as ghost text (grayed out, inline) at cursor position without blocking text input
  6. Suggestion latency p95 < 300ms; p50 < 150ms target. If p95 > 300ms after Week 1 tuning, flag for v0.2.1 optimization
  7. User can accept suggestion with Tab key (committed to document), reject with Escape key (discarded), or edit suggestion text before accepting
  8. If suggestion takes >1s to generate, a loading indicator appears
  9. Chat context pane shows "Selected for suggestions" indicator listing which papers/notes are being used as context
  10. User can select/deselect papers and notes from chat context pane to control which documents inform suggestion generation
  11. OpenRouter API key is securely stored and fetched (use existing tauri-plugin-store pattern)
  12. Suggestion acceptance rate tracked (target: >50%)

**Plans:** TBD

**UI hint:** yes

**Architecture notes:** 
- Extend existing LLM provider abstraction (OllamaProvider, OpenAIProvider) with OpenRouterProvider
- All three share same streaming interface (AsyncIterable<string>)
- Suggestion service reads from context-selection store (shared with chat)
- Use debounce + abort pattern to cancel pending suggestions on keystroke

---

### Phase 10: Backlinks UI + Link Safeguards

**Goal:** Users can discover which documents/notes reference each paper, with delete protection and visual safeguards against link clutter.

**Depends on:** Phase 9

**Requirements:** LINK-03, LINK-04, LINK-05 (deepened), UX (backlinks view)

**Success Criteria** (what must be TRUE when phase completes):
  1. User can click a paper reference to open paper detail panel; paper detail displays backlinks pane showing "This paper is referenced in X documents/notes"
  2. Backlinks list shows document titles, snippet of containing text, and link count
  3. Clicking a backlink navigates to the referencing document and highlights the link
  4. When a paper is deleted from library, its references in documents are marked as "missing" (orphaned) but preserved in `.links.json` for recovery
  5. Delete operation shows warning: "This paper is referenced in X documents. Continue?" with option to view backlinks before deletion
  6. Backlinks pane collapsible (default open if < 5 links, collapsed if > 5) to prevent visual density issues
  7. Broken link recovery: "Fix broken links" dialog shows all orphaned references with option to delete or re-link
  8. Link metrics dashboard shows: total links, broken links %, backlink density distribution

**Plans:** TBD

**UI hint:** yes

---

### Phase 11: Export & Polish

**Goal:** Users can export literature review documents to PDF with full metadata, paper references, and formatted appendix. Final quality metrics tracking.

**Depends on:** Phase 10

**Requirements:** EXP-01, EXP-02, EXP-03

**Success Criteria** (what must be TRUE when phase completes):
  1. User can export document to PDF with title, author metadata, and formatted document content
  2. PDF includes appendix listing all referenced papers (title, authors, year, URL/link) in a readable format
  3. Export dialog presents three export options: full PDF (with references), markdown only (no references), or markdown with references list
  4. User can successfully download exported file and PDF renders correctly in standard PDF viewers
  5. Final metrics: suggestion acceptance rate >50%, latency p95 <300ms, broken links <5%, zero undo/redo data loss

**Plans:** TBD

**UI hint:** yes

---

## Requirement Traceability

| REQ-ID | Category | Phase | Status |
|--------|----------|-------|--------|
| DOC-01 | Document Management | Phase 8 | Planned |
| DOC-02 | Document Management | Phase 8 | Planned |
| DOC-03 | Document Management | Phase 8 | Planned |
| DOC-04 | Document Management | Phase 8 | Planned |
| DOC-05 | Document Management | Phase 8 | Planned |
| DOC-06 | Document Management | Phase 8 | Planned |
| LINK-01 | Paper References & Linking | Phase 8 | Planned |
| LINK-02 | Paper References & Linking | Phase 8 | Planned |
| LINK-03 | Paper References & Linking | Phase 10 | Planned |
| LINK-04 | Paper References & Linking | Phase 10 | Planned |
| LINK-05 | Paper References & Linking | Phase 10 | Planned |
| LINK-06 | Paper References & Linking | Phase 8 | Planned |
| SUGG-01 | Inline Suggestions | Phase 9 | Planned |
| SUGG-02 | Inline Suggestions | Phase 9 | Planned |
| SUGG-03 | Inline Suggestions | Phase 9 | Planned |
| SUGG-04 | Inline Suggestions | Phase 9 | Planned |
| SUGG-05 | Inline Suggestions | Phase 9 | Planned |
| SUGG-06 | Inline Suggestions | Phase 9 | Planned |
| SUGG-07 | Inline Suggestions | Phase 9 | Planned |
| SUGG-08 | Inline Suggestions | Phase 9 | Planned |
| EXP-01 | Export | Phase 11 | Planned |
| EXP-02 | Export | Phase 11 | Planned |
| EXP-03 | Export | Phase 11 | Planned |
| UX-01 | Editor Experience | Phase 8 | Planned |
| UX-02 | Editor Experience | Phase 8 | Planned |
| UX-03 | Editor Experience | Phase 8 | Planned |
| UX-04 | Editor Experience | Phase 9 | Planned |
| LLM-MULTI-01 | Multi-Provider LLM | Phase 9 | Planned |
| LLM-MULTI-02 | Multi-Provider LLM | Phase 9 | Planned |
| LLM-MULTI-03 | Multi-Provider LLM | Phase 9 | Planned |

**Total Requirements:** 30/30 ✓ (100% coverage, including new OpenRouter reqs)

---

## Progress Tracking

| Phase | Goal | Requirements | Success Criteria | Status |
|-------|------|--------------|------------------|--------|
| 8 | Document Editor + References | 9 | 9 | Planning complete, 3 plans created |
| 9 | Conservative Suggestions (Multi-LLM) | 10 | 12 | Not started |
| 10 | Backlinks UI + Safeguards | 5 | 8 | Not started |
| 11 | Export & Polish | 3 | 5 | Not started |

---

## Key Dependencies

```
Phase 8: Document Editor + Paper References (foundation)
    ↓
Phase 9: Conservative Inline Suggestions (with multi-provider LLM)
    ↓
Phase 10: Backlinks UI + Link Safeguards
    ↓
Phase 11: Export & Polish
```

---

## Critical Success Metrics (from pitfall analysis)

- **Suggestion latency p95 < 300ms** (p50 < 150ms preferred) — if not achievable in Week 1, defer to v0.2.1
- **Suggestion acceptance rate > 50%** — measure via telemetry
- **Zero undo/redo data loss** — 100% atomicity, zero corruption cases
- **Broken links < 5%** — across workspace
- **Link deletion protection** — no accidental link breakage on paper delete

---

## Architecture Notes

**LLM Provider Abstraction (Multi-Provider Support):**
```typescript
// Extend existing provider interface
interface LLMProvider {
  generateSuggestion(
    papers: Paper[],
    currentText: string,
    options?: ChatOptions
  ): AsyncIterable<string>
}

// Implementations: OllamaProvider, OpenAIProvider, OpenRouterProvider
// All share same streaming interface
// Fallback chain: try primary → fallback → error
```

**Secure API Key Storage (for OpenRouter):**
- Use existing `tauri-plugin-store` pattern
- Encrypt at rest, decrypt on use
- User configurable via settings dialog

**Document Model with Links:**
```
{workspace}/documents/{docId}.md (content)
{workspace}/documents/{docId}.links.json (bidirectional link metadata)
```

**Link Safeguards:**
- Delete warning: show backlink count and preview
- Orphan handling: preserve `.links.json` entries, mark as "missing"
- Recovery: "Fix broken links" dialog with repair options

---

*Last updated: 2026-04-09 (Phase 8 planning complete, 3 plans created with 12 tasks total across 3 waves)*
