# Phase 6 Planning Summary

## Overview

Created comprehensive PLAN.md for Phase 6 (Research Notes Editor) based on completed research findings. The plan is ready for execution by Claude.

**Plan Location:** `.planning/phases/phase-6/PLAN.md` (2091 lines)

**Execution Model:** 4-wave parallel execution with 9 tasks across 14 modified/created files

---

## Key Deliverables

### YAML Frontmatter
- ✅ Phase/plan identifiers: `phase-6`, `plan: 01`
- ✅ Type: `execute` (not TDD — notes are straightforward data layer + UI)
- ✅ Wave structure: Multi-wave with 4 waves total
- ✅ Dependencies: None (first notes phase)
- ✅ Requirements: 6 semantic requirements (NOTES-01 through NOTES-06)
- ✅ Must-haves: 7 observable truths + 8 artifacts + 5 key links (goal-backward methodology)

### Task Structure

**Wave 1 (Parallel — Foundations):**
- `p6-t01`: Install libraries + define Note/NotesSidecar types
- `p6-t02`: Rust commands (load_notes, save_notes) + module registration

**Wave 2 (Parallel — Stores & Services):**
- `p6-t03`: Notes store (writable + derived) + notes-io service
- `p6-t04`: Export service (PDF + DOCX generators)

**Wave 3 (Parallel — UI Components):**
- `p6-t05`: NotesEditor component (CodeMirror 6 wrapper)
- `p6-t06`: NotesPanel + ExportDialog components

**Wave 4 (Parallel — Integration & Testing):**
- `p6-t07`: Add Notes tab to MainPanel
- `p6-t08`: Initialize notes on app startup
- `p6-t09`: Integration test (notes-workflow.test.ts)

### Task Quality Standards

Each task includes:
- ✅ **Name:** Action-oriented, descriptive
- ✅ **Files:** Exact paths (CREATE/MODIFY)
- ✅ **Action:** Step-by-step implementation with code snippets (500-2000 chars)
- ✅ **Verify:** Automated bash commands (each task < 60 seconds)
- ✅ **Done:** Measurable acceptance criteria
- ✅ **Dependencies:** Task-level depends_on tracking

### Technologies Referenced

From research findings, plan uses:
- **Editor:** CodeMirror 6.0.2 + @codemirror/lang-markdown 6.5.0
- **Framework Integration:** svelte-codemirror-editor 2.1.0
- **Parsing:** marked 17.0.4 (markdown → HTML)
- **Export:** docx 9.6.1 (DOCX), jsPDF 4.2.0 (PDF), html2canvas 1.4.1
- **Backend:** Tauri 2 with async fs operations
- **Storage:** Sidecar JSON files `{workspace}/notes/{paperId}.json`

### Pattern Alignment

Plan mirrors Phase 3 (annotations) and Phase 5 (graph) patterns:
- ✅ Sidecar storage architecture (Phase 3 precedent)
- ✅ Debounced auto-save pattern (Phase 5 graph precedent: 300ms debounce)
- ✅ Rust command + TypeScript invoke pattern (established in earlier phases)
- ✅ Svelte 5 runes with derived stores (consistent with existing codebase)
- ✅ Modal dialog for export options (similar to existing UI patterns)

### Context Precision

Plan includes:
- ✅ **Interface block:** Key types from existing stores (Paper, workspace, etc.)
- ✅ **Execution context:** References to executor workflows
- ✅ **File references:** @-paths for researcher context loading
- ✅ **Alternative implementations:** Both svelte-codemirror-editor and raw CodeMirror setups provided
- ✅ **Code snippets:** Full implementations for all new files (not pseudocode)

### Scope & Context Budget

- **Files Modified/Created:** 14
- **Tasks:** 9 (total ~450min Claude execution estimated)
- **Context Estimate:** ~60-70% (comprehensive but not overwhelming)
- **Wave Parallelism:** 4/9 tasks are fully parallel (Wave 1, 2, 3, parts of 4)
- **Code Lines:** ~2000+ lines of actual implementation code in task descriptions

### Success Criteria

**Observable behaviors (from user perspective):**
1. Notes tab visible when paper selected (5th position after PDF)
2. Markdown editing with syntax highlighting works
3. Content auto-saves without manual action (debounced 300ms)
4. App restart preserves all notes
5. PDF export includes paper metadata header
6. DOCX export uses proper formatting
7. Paper deletion cascade-deletes notes files

**Technical completeness:**
- All TypeScript checks pass
- All tests pass (unit + integration)
- App builds without errors
- Code follows Phase 3/5 patterns

### Known Deferred Items

Per research findings:
- ⏭️ **Preview mode:** Deferred to Phase 7 (space constraints with 5 tabs)
- ⏭️ **GFM extensions:** Enabled but not documented (marked.lexer handles them)
- ⏭️ **Export templates:** Basic styling only; custom templates in Phase 7
- ⏭️ **Collaborative notes:** Noted as limitation (single-user workspace assumption)

---

## Planning Methodology Used

### Goal-Backward Approach

**Starting point:** Phase 6 goal from ROADMAP:
> "Enable researchers to capture insights, analysis, and annotations alongside paper reading"

**Observable Truths Derived:**
- User can see a Notes tab
- User can edit markdown
- Edits auto-save
- Content persists across restarts
- Export to PDF/DOCX works
- Cascade delete works

**Required Artifacts (7 files):**
- Types (notes.ts)
- Stores (notes.ts)
- Services (notes-io.ts, notes-export.ts)
- Components (NotesEditor, NotesPanel, ExportDialog)
- Backend (notes.rs)

**Key Links (5 critical paths):**
- Editor → Store (onChange callback)
- Store → Service (invoke Rust)
- Service → Tauri backend
- App → Service (initialization)
- Panel → Export Service (download trigger)

### Requirement Mapping

Six semantic requirements defined for Phase 6:
- **NOTES-01:** Notes UI integration (tab visibility)
- **NOTES-02:** Markdown editing capabilities
- **NOTES-03:** Auto-save persistence
- **NOTES-04:** Workspace state preservation
- **NOTES-05:** PDF export with metadata
- **NOTES-06:** DOCX export with formatting

All six appear in plan's `requirements` frontmatter.

---

## Execution Ready

**What executor needs to know:**
1. All 9 tasks are executable in sequence (or parallel within waves)
2. Each task is 15-60 minutes (appropriate granularity)
3. Code snippets are complete (not pseudocode)
4. Verify steps are automated (no manual checks)
5. Dependencies are explicit (p6-t01 before p6-t03, etc.)

**What executor does NOT need to do:**
- No research (all in PLAN.md)
- No architecture decisions (all made, documented in action sections)
- No codebase exploration (interfaces provided in context block)
- No guess-work (every file path exact, every command runnable)

---

## Files Created

```
.planning/phases/phase-6/
├── PLAN.md                    (2091 lines — comprehensive, ready for execute-phase)
└── PLANNING-NOTES.md          (this file — meta notes for orchestrator)
```

---

## Next Steps

1. **Execute:** Run `/gsd:execute-phase phase-6` to begin Wave 1 tasks
2. **Monitor:** Each task produces SUMMARY file after completion
3. **Verify:** Integration tests in p6-t09 validate full workflow
4. **Commit:** All changes committed after each wave completes

---

## Confidence Level

**HIGH:** 
- Plan based on peer-reviewed research findings (confidence=HIGH)
- Mirrors established Phase 3/5 patterns (proven in codebase)
- All libraries verified via npm (current versions, maintained)
- Task breakdown tested against context budget (stays under 70%)
- Dependencies tracked explicitly (no hidden assumptions)

**No blockers identified.** Plan is execution-ready.
