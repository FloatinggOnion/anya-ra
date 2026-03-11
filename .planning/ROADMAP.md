# Anya-RA Development Roadmap

## Overview

7 phases from foundation scaffold to full research assistant capabilities.

## Phases

| Phase | Name | Plans | Status | Progress |
|-------|------|-------|--------|----------|
| 1 | Foundation | 1 | ✅ Complete | 1/1 complete |
| 2 | Paper Management | TBD | Planned | - |
| 3 | PDF Viewer & Annotations | 16 | Planned | 0/16 tasks |
| 4 | Knowledge Graph | TBD | Planned | - |
| 5 | Writing & Export | TBD | Planned | - |
| 6 | LLM Integration | TBD | Planned | - |
| 7 | Polish & Performance | TBD | Planned | - |

## Phase 1: Foundation

**Goal:** User can launch app, select workspace folder, and see empty but functional UI shell

**Plans:**
- [x] PLAN.md — Scaffold Tauri v2 + Svelte 5 with workspace selection and 3-panel layout ✅

**Commits:** 4b12bbe, da088ba, 990f4b9

**Requirements:** SETUP-01, SETUP-02, SETUP-03

## Phase 2: Paper Management (Planned)

**Goal:** Users can import, browse, and search their research papers

## Phase 3: PDF Viewer & Annotations (Planned)

**Goal:** Built-in PDF viewer with highlight, sticky note, and underline annotations. Annotations persist in JSON sidecar files. 60fps rendering.

**Plans:** 16 tasks in 5 milestones

Plans:
- [ ] P3-T01 — Install dependencies & configure PDF.js worker
- [ ] P3-T02 — Create annotation type definitions
- [ ] P3-T03 — Create annotation Svelte store
- [ ] P3-T04 — Scaffold test files (Wave 0)
- [ ] P3-T05 — Create coordinate transform utilities
- [ ] P3-T06 — Implement text selection handler
- [ ] P3-T07 — Create annotation toolbar component
- [ ] P3-T08 — Create SVG annotation overlay component
- [ ] P3-T09 — Create PDF canvas component
- [ ] P3-T10 — Integrate PDF viewer with overlay
- [ ] P3-T11 — Implement Tauri annotation commands (Rust)
- [ ] P3-T12 — Create annotation service layer (Frontend)
- [ ] P3-T13 — Implement sticky note component
- [ ] P3-T14 — Add page navigation controls
- [ ] P3-T15 — Implement page cache with LRU eviction
- [ ] P3-T16 — Implement zoom/scroll RAF throttling

**Requirements:** PDF-01, PDF-02, PDF-03, PDF-04, PDF-05, PDF-06

**Tech Stack:**
- `pdfjs-dist` v3.11+ (Canvas-based rendering)
- SVG overlay for annotations
- JSON sidecar files for persistence
- Lazy rendering with LRU cache
- RAF throttling for 60fps

## Phase 4: Knowledge Graph (Planned)

**Goal:** Visual knowledge graph of papers, concepts, and connections

## Phase 5: Writing & Export (Planned)

**Goal:** LaTeX-capable editor with export to PDF/DOCX

## Phase 6: LLM Integration (Planned)

**Goal:** Ollama-backed AI assistance throughout the app

## Phase 7: Polish & Performance (Planned)

**Goal:** Cross-platform polish, performance optimizations, release preparation
