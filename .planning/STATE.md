# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-03-11)

**Core value:** Every step of the research loop — discover, read, annotate, map, write — happens in one fast, integrated application without switching tools.
**Current focus:** Phase 1 - Foundation

## Current Position

Phase: 1 of 7 (Foundation)
Plan: 1 of 1 ✅ Complete
Status: Phase 1 Complete — Ready for Phase 2
Last activity: 2026-03-11 — Phase 1 execution complete

Progress: [██░░░░░░░░] 14% (1 of 7 phases)

## Performance Metrics

**Velocity:**
- Total plans completed: 1
- Average duration: 35 min
- Total execution time: 0.58 hours

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| Phase 1 | 1 | 35 min | 35 min |

**Recent Trend:**
- Last 5 plans: None yet
- Trend: N/A

*Updated after each plan completion*

## Accumulated Context

### Decisions

Decisions are logged in PROJECT.md Key Decisions table.
Recent decisions affecting current work:

- Tauri v2 over Electron: Smaller binaries, faster startup, Rust backend for performance-critical work
- Ollama as LLM runtime: Clean separation of concerns, user manages models
- Folder-based workspaces: Files stay where researchers expect them, no proprietary database lock-in
- LLM assists, never automates: Quality of literature review depends on researcher judgment
- Plain Svelte + Vite (no SvelteKit): create-tauri-app scaffold defaulted to SvelteKit; manually converted per tech stack requirement
- Dark-first CSS custom properties: Enables future light-mode toggle without CSS framework dependency
- Capabilities-based permissions: Minimal permission footprint (dialog, fs, store only)

### Pending Todos

None yet.

### Blockers/Concerns

None yet.

## Session Continuity

Last session: 2026-03-11 (Phase 1 execution)
Stopped at: Phase 1 complete — all 11 tasks done, 3 commits, SUMMARY created
Resume file: None

## Tech Stack Reference

**Frontend:** Svelte 5 + Vite (no SvelteKit), @tauri-apps/api v2
**Backend:** Tauri v2 (Rust 1.70+), tokio async runtime
**PDF:** PDF.js (rendering) + pdfium-render (text extraction), SVG overlay, JSON sidecar
**LLM:** Ollama (Qwen2 0.5B default), OpenAI-compatible adapter for cloud
**Graph:** @xyflow/svelte (WebGL, Svelte-native)
**Editor:** TipTap + KaTeX, svelte-tiptap
**Export:** Tectonic (PDF), docx-rs (DOCX)
**State:** Svelte 5 Runes (local) + Svelte stores (shared/global)

## Research Context

Comprehensive research completed for:
- Tauri v2 + Svelte 5 integration patterns
- PDF handling (PDF.js + pdfium-render + annotation strategy)
- LLM integration (Ollama API, streaming, context management)
- Paper discovery APIs (arXiv, Semantic Scholar, PubMed, CrossRef)
- Knowledge graph (@xyflow/svelte) and editor (TipTap)

Research files available in research/ directory for reference during planning.
