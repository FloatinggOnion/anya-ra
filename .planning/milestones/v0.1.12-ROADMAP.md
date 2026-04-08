# Anya-RA Development Roadmap

## Overview

7 phases from foundation scaffold to full research assistant capabilities.

## Phases

| Phase | Name | Plans | Status | Progress |
|-------|------|-------|--------|----------|
| 1 | Foundation | 1 | ✅ Complete | 1/1 complete |
| 2 | Paper Management | 4 | Planned | 0/4 complete |
| 3 | PDF Viewer & Annotations | 16 | Planned | 0/16 tasks |
| 4 | LLM Integration | 5 | Planned | - |
| 5 | Knowledge Graph | TBD | Planned | - |
| 6 | Writing & Export | TBD | Planned | - |
| 7 | Polish & Performance | TBD | Planned | - |

## Phase 1: Foundation

**Goal:** User can launch app, select workspace folder, and see empty but functional UI shell

**Plans:**
- [x] PLAN.md — Scaffold Tauri v2 + Svelte 5 with workspace selection and 3-panel layout ✅

**Commits:** 4b12bbe, da088ba, 990f4b9

**Requirements:** SETUP-01, SETUP-02, SETUP-03

## Phase 2: Paper Management

**Goal:** Paper discovery via arXiv and Semantic Scholar + local PDF import. Papers appear in sidebar list. Paywall papers flagged. All metadata persists in workspace folder.

**Plans:** 4 plans (3 waves)

Plans:
- [ ] phase-2/02-01-PLAN.md — Paper Type System & Storage (types, Rust storage, TypeScript services)
- [ ] phase-2/02-02-PLAN.md — arXiv API Integration (quick-xml parsing, rate limiting)
- [ ] phase-2/02-03-PLAN.md — Semantic Scholar & Local Import (S2 API, PDF import)
- [ ] phase-2/02-04-PLAN.md — Paper UI (virtual list, search interface, detail view)

**Wave Structure:**
- Wave 1: Plans 01, 02 (parallel - independent foundation work)
- Wave 2: Plan 03 (depends on Plan 01 types)
- Wave 3: Plan 04 (depends on all APIs working)

**Requirements:** PAPER-01, PAPER-02, PAPER-03, PAPER-04, PAPER-05

## Phase 3: PDF Viewer & Annotations ✅ Complete

**Goal:** Built-in PDF viewer with highlight, sticky note, and underline annotations. Annotations persist in JSON sidecar files. 60fps rendering.

**Plans:** 16 tasks in 5 milestones — 1/1 complete

Plans:
- [x] PLAN.md — PDF Viewing & Annotations (16 tasks, 5 milestones) ✅

**Commits:** 7c1aa6f, 544097f, 88b1844, 18065e5, 8d90d2e

**Requirements:** PDF-01, PDF-02, PDF-03, PDF-04, PDF-05, PDF-06

**Tech Stack:**
- `pdfjs-dist` v3.11.174 (Canvas-based rendering, Vite ?url worker)
- SVG overlay for annotations (highlight + underline)
- JSON sidecar files `{pdf}.annotations.json` + sha2 hash
- LRU PageCache (10 pages), ±2 prefetch
- RAF-throttled ViewportManager for 60fps

## Phase 4: LLM Integration (Planned)

**Goal:** Ollama chat interface with streaming responses, user-selectable context (papers/notes), draft section suggestions with accept/reject UI, and cloud provider fallback

**Plans:** 5 plans in 3 waves

Plans:
- [ ] 04-01-PLAN.md — LLM Provider abstraction + Ollama implementation + types
- [ ] 04-02-PLAN.md — Chat store + streaming UI component
- [ ] 04-03-PLAN.md — OpenAI provider + API key management + provider switcher
- [ ] 04-04-PLAN.md — Context selection UI + token budgeting
- [ ] 04-05-PLAN.md — Draft suggestions UI + chat persistence

**Wave Structure:**
- Wave 1: Plans 01, 02 (parallel - provider foundation + chat UI)
- Wave 2: Plans 03, 04 (parallel - cloud fallback + context selection)
- Wave 3: Plan 05 (depends on chat + context - draft suggestions + persistence)

**Requirements:** LLM-01 (Ollama integration), LLM-02 (streaming chat), LLM-03 (chat UI), LLM-04 (context selection), LLM-05 (token budgeting), LLM-06 (cloud fallback), LLM-07 (draft suggestions + persistence)

**Tech Stack:**
- Browser `fetch` API for streaming (Ollama JSON-per-line, OpenAI SSE)
- `js-tiktoken` for token counting
- `tauri-plugin-store` for encrypted API keys
- Ollama default model: `qwen2:0.5b` (32K context, ~2GB RAM)
- Chat persistence: `{workspace}/chats/{chatId}.json`

## Phase 5: Knowledge Graph (Planned)

**Goal:** Visual knowledge graph of papers, concepts, and connections

**Plans:** 1 plan (9 tasks, 5 waves)

Plans:
- [ ] phase-5/PLAN.md — Knowledge Graph: @xyflow/svelte canvas, 3 custom node types, TypedEdge, Rust persistence, MainPanel tab integration, PaperDetail "Add to Graph", App.svelte init

**Wave Structure:**
- Wave 1: p5-t01 (types + install), p5-t02 (Rust commands) — parallel
- Wave 2: p5-t03 (store + service), p5-t04 (custom node components) — parallel
- Wave 3: p5-t05 (GraphCanvas)
- Wave 4: p5-t06 (MainPanel tab), p5-t07 (PaperDetail button), p5-t08 (App.svelte init) — parallel
- Wave 5: p5-t09 (polish)

**Requirements:** GRAPH-01 through GRAPH-09

**Tech Stack:**
- `@xyflow/svelte` 1.5.1 (Svelte 5 native, peer: `svelte ^5.25.0`)
- `$state.raw()` arrays (required by SvelteFlow — no deep reactivity)
- `nodeTypes.ts` at module scope (prevents remount flicker)
- Rust `save_graph_file` / `load_graph_file` → `{workspace}/graph.json`
- Orphan filtering on load (paper nodes validated against papers store)

## Phase 6: Writing & Export (Planned)

**Goal:** LaTeX-capable editor with export to PDF/DOCX

## Phase 7: Polish & Performance (Planned)

**Goal:** Cross-platform polish, performance optimizations, release preparation
