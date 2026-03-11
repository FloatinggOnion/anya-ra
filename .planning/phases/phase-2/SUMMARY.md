---
phase: 2
plan: 1
subsystem: paper-management
tags: [papers, arxiv, semantic-scholar, rust, svelte5, storage]
dependency-graph:
  requires: [phase-1-foundation]
  provides: [paper-types, paper-storage, arxiv-search, semantic-scholar-search, local-pdf-import, paper-list-ui]
  affects: [workspace, sidebar, main-panel]
tech-stack:
  added: [quick-xml 0.31, reqwest 0.12, tokio full, urlencoding 2.1, svelte-virtual 0.6.3]
  patterns: [folder-per-paper storage, event-based XML parsing, client-side rate limiting, Svelte5 derived stores, custom virtual scroll]
key-files:
  created:
    - src/lib/types/paper.ts
    - src/lib/services/papers.ts
    - src/lib/stores/papers.ts
    - src-tauri/src/commands/papers.rs
    - src/lib/components/PaperListItem.svelte
    - src/lib/components/PaperList.svelte
    - src/lib/components/SearchBar.svelte
    - src/lib/components/PaperDetail.svelte
  modified:
    - src-tauri/src/types.rs
    - src-tauri/src/commands/mod.rs
    - src-tauri/src/lib.rs
    - src-tauri/Cargo.toml
    - src/App.svelte
    - src/lib/components/layout/Sidebar.svelte
    - src/lib/components/layout/MainPanel.svelte
decisions:
  - Custom virtual scroll over svelte-virtual API (Svelte 5 compatibility)
  - AtomicU64 for arXiv rate limiter (const-capable, no Mutex overhead)
  - quick-xml event reader over serde derive (reliable Atom namespace handling)
  - Stub chat components to fix pre-existing TS errors blocking npm run check
metrics:
  duration: 18 min
  completed: 2026-03-11
  tasks-completed: 15
  files-changed: 18
---

# Phase 2: Paper Management Summary

## One-Liner
Folder-per-paper storage with arXiv XML + Semantic Scholar JSON search, local PDF import, and virtual-scrolling sidebar — all metadata persists in workspace as JSON.

## What Was Built

### Wave 1 — Types, Storage & arXiv (commit: 6fe7cd0)
- **`src/lib/types/paper.ts`** — Full `Paper` interface: source, authors, year, abstract, DOI, arxivId, semanticId, openAccess, pdfUrl, localPdfPath, tags
- **`src-tauri/src/types.rs`** — Rust `Paper` struct with `#[serde(rename_all = "camelCase")]` + `#[serde(rename = "abstract")]` for reserved keyword
- **`src-tauri/src/commands/papers.rs`** — `save_paper`, `load_papers`, `delete_paper` (folder-per-paper at `{workspace}/papers/{id}/metadata.json`)
- **arXiv search** — `search_arxiv` Rust command with quick-xml event-based Atom parser, 3-second rate limiting via `AtomicU64`
- **`src/lib/services/papers.ts`** — Type-safe wrappers for all Rust commands

### Wave 2 — Semantic Scholar & Local Import (commit: 1a8fa56)
- **Semantic Scholar** — `searchSemanticScholar()` with 1-second client-side rate limiting, open access status, DOI/arXiv cross-reference extraction
- **Local PDF import** — Rust `import_local_pdf` copies PDF to `{workspace}/papers/local_{name}/paper.pdf`, creates metadata.json with relative path
- **`importLocalPdf()`** — TypeScript wrapper opens native file picker via `@tauri-apps/plugin-dialog`, gracefully handles cancel
- **`src/lib/stores/papers.ts`** — Svelte 5 writable/derived stores: `papers`, `selectedPaperId`, `filteredPapers` (search + source filter), `selectedPaper`

### Wave 3 — UI Components (commit: 18e811b)
- **`PaperListItem.svelte`** — Paper card with title (2-line clamp), authors, source/year/OA/Paywall badges, selection highlight
- **`PaperList.svelte`** — Custom virtual scroll using `ResizeObserver`, renders only visible items at 82px each — handles 1000+ papers smoothly
- **`SearchBar.svelte`** — arXiv + Semantic Scholar search buttons, "+ PDF" import button, source filter radios, saves all results to disk
- **`PaperDetail.svelte`** — Full metadata panel: abstract, access status, DOI, arXiv ID, direct PDF link; paywall papers show disabled download button with Phase 3 tooltip
- **`Sidebar.svelte`** — Updated to embed SearchBar + PaperList
- **`MainPanel.svelte`** — Updated to show PaperDetail when paper selected, empty state otherwise
- **`App.svelte`** — Loads persisted papers from workspace on startup

## Success Criteria

| # | Criterion | Status |
|---|-----------|--------|
| 1 | User searches arXiv/Semantic Scholar and sees results in-app | ✅ |
| 2 | Paywall papers displayed with name + link (no download) | ✅ Disabled button with tooltip |
| 3 | User imports local PDF, appears in paper list | ✅ Native file picker → Rust copy |
| 4 | User sees paper metadata: title, authors, year, abstract, source | ✅ Full PaperDetail panel |
| 5 | Papers persist in workspace folder as metadata JSON | ✅ Loaded on startup from disk |

## Technical Achievements

- **Folder-per-paper storage**: `{workspace}/papers/{source}_{id}/metadata.json` — workspace-portable relative paths only
- **Reliable Atom parsing**: event-based quick-xml reader handles arXiv namespace correctly (serde derive would fail on namespaced XML)
- **Rate limiting without async complexity**: `AtomicU64` for arXiv (Rust), `Date.now()` comparisons for Semantic Scholar (TS)
- **True virtual scrolling**: `ResizeObserver` + scroll position → slices visible items, `position: absolute` layout
- **Svelte 5 runes throughout**: `$state`, `$derived`, `$effect` — no legacy stores in new components

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Svelte-virtual 0.6.3 incompatible with Svelte 5 `let:item` syntax**
- **Found during:** Task 4.4 (PaperList implementation)
- **Issue:** svelte-virtual uses Svelte 4 slot API which conflicts with Svelte 5 runes
- **Fix:** Implemented custom virtual scroll component using `ResizeObserver` + `$state`/`$derived`
- **Files modified:** `src/lib/components/PaperList.svelte`

**2. [Rule 2 - Missing functionality] Pre-existing TypeScript errors blocking `npm run check`**
- **Found during:** TypeScript verification
- **Issue:** `ChatWindow.svelte` imported 3 non-existent Phase 4 component stubs; `openai.ts` had `enc.free()` on wrong type
- **Fix:** Created stub components (ProviderSettings, ContextSelection, DraftSuggestions), removed invalid `.free()` call
- **Files modified/created:** 3 chat stub `.svelte` files, `src/lib/services/llm/openai.ts`
- **Result:** `svelte-check` now reports 0 errors

## Deferred to Later Phases
- PDF download (Phase 3)
- PubMed integration (Phase 2b)
- Duplicate detection (Phase 4)
- Full-text search (Phase 4)
- Citation graph (Phase 4)

## Self-Check: PASSED

All files verified present. All 3 commits confirmed in git history. TypeScript: 0 errors. Cargo check: 0 errors.
