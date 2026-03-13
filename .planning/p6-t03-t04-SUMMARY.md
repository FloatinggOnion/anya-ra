---
phase: 6
plan: p6-t03-t04
subsystem: notes
tags: [stores, services, export, auto-save]
dependencies:
  requires: [p6-t01, p6-t02]
  provides: [notes-store, notes-io-service, export-service]
  affects: [notes-editor, export-ui]
tech-stack:
  added: [marked, jsPDF, html2canvas, docx library]
  patterns: [svelte stores, Tauri invoke, debounced persistence]
key-files:
  created:
    - src/lib/stores/notes.ts
    - src/lib/services/notes-io.ts
    - src/lib/services/notes-export.ts
decisions: []
metrics:
  duration: 3 minutes
  tasks-completed: 2
  files-created: 3
---

# Phase 6 Plan p6-t03-t04: Notes Store, Auto-save, and Export Services Summary

**Notes store with debounced auto-save, notes I/O service layer, and PDF/DOCX export service.**

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| p6-t03 | Notes store + auto-save service | ff45df2 | src/lib/stores/notes.ts, src/lib/services/notes-io.ts |
| p6-t04 | Export service (PDF/DOCX) | 91f23a7 | src/lib/services/notes-export.ts |

## What Was Built

### p6-t03: Notes Store & Auto-save

**File: `src/lib/stores/notes.ts`**
- Writable Svelte store mapping `paperId → NotesSidecar`
- `currentPaperNote` derived store (reactive to paper selection)
- `saveNote()` function with debounced persistence (300ms window)
- Optimistic UI updates with deferred disk writes
- Cancels pending saves when new content arrives (latest wins)

**File: `src/lib/services/notes-io.ts`**
- `loadNotes()`: Load from `{workspace}/notes/{paperId}.json`, returns null if not found
- `saveNotes()`: Write to disk via Tauri invoke, auto-creates directory
- Error handling: logs failures, propagates on write errors

### p6-t04: Export Service

**File: `src/lib/services/notes-export.ts`**
- **PDF Export**: 
  - Renders markdown → HTML via `marked` library
  - Converts to canvas via `html2canvas`
  - Generates multi-page PDF via `jsPDF`
  - Includes paper title + authors header
- **DOCX Export**:
  - Parses markdown tokens via `marked.lexer()`
  - Maps tokens to `docx` library Paragraph objects
  - Supports headings, paragraphs, code, lists, blockquotes, HR
  - Proper styling (bold title, italic authors, indented blockquotes)
- **Helper**: `downloadFile()` for browser downloads (blob → URL → click)

## Type Check Results

✅ **0 errors, 10 warnings** (pre-existing, unrelated)

**Fixed issues during implementation:**
- Corrected docx library API: `bold`/`italics` must be in TextRun children, not Paragraph props
- Used proper paragraph structure with TextRun children for formatting

## Deviations from Plan

**None — plan executed exactly as specified.**

One minor fix applied (Rule 1 - Auto-fix API usage):
- **Issue**: docx library type mismatch (`bold`, `italics` not valid Paragraph options)
- **Fix**: Refactored to use TextRun children for text formatting
- **Files**: src/lib/services/notes-export.ts
- **Commit**: 91f23a7

## Verification Steps

All files created and verified:
```bash
ls -la src/lib/stores/notes.ts
ls -la src/lib/services/notes-io.ts
ls -la src/lib/services/notes-export.ts
pnpm run check # ✅ PASSED (0 errors)
```

## Self-Check

✅ All files created and present
✅ Both tasks committed with proper messages
✅ Type check passing (0 errors)
✅ No unresolved dependencies
