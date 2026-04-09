---
gsd_state_version: 1.0
milestone: v0.2.0
milestone_name: Enhanced Interactive Writing
status: planning
last_updated: "2026-04-08T20:35:00.000Z"
last_activity: 2026-04-08
progress:
  total_phases: 4
  completed_phases: 0
  total_plans: null
  completed_plans: 0
  percent: 0
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-04-08)

**Core value:** Every step of the research loop — discover, read, annotate, map, write — happens in one fast, integrated application without switching tools.
**Current focus:** v0.2.0 — Standalone literature review editor with inline AI suggestions and paper/document linking

## Current Position

Phase: 8 (Document Editor Foundation) — ready to plan
Plan: —
Status: ROADMAP created, awaiting phase decomposition
Last activity: 2026-04-08 — Roadmap v0.2.0 created (4 phases, 27 requirements mapped)

Progress: [░░░░░░░░░░] 0% (planning complete, execution pending)

## Phase Structure (v0.2.0)

**Phase 8: Document Editor Foundation** — Create, persist, and edit standalone documents
- Requirements: 8 (DOC-01 to DOC-06, UX-01, UX-02)
- Success criteria: 6 observable behaviors
- Status: Not started

**Phase 9: Paper Linking System** — Reference syntax, backlinks, orphan handling
- Requirements: 7 (LINK-01 to LINK-06, UX-03)
- Success criteria: 6 observable behaviors
- Status: Not started

**Phase 10: Inline Suggestions** — AI writing assistance with ghost text, debounce, context selection
- Requirements: 9 (SUGG-01 to SUGG-08, UX-04)
- Success criteria: 6 observable behaviors
- Status: Not started

**Phase 11: Export & Polish** — PDF export with metadata and references appendix
- Requirements: 3 (EXP-01 to EXP-03)
- Success criteria: 4 observable behaviors
- Status: Not started

## Performance Metrics

**Velocity (from v0.1.12):**

- Total plans completed: 3
- Average duration: 27 min
- Total execution time: 1.36 hours

**By Phase (v0.1.12):**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| Phase 1 | 1 | 35 min | 35 min |
| Phase 2 | 1 | 18 min | 18 min |
| Phase 3 | 1 | 29 min | 29 min |

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
- [Phase phase-2]: Custom virtual scroll over svelte-virtual: Svelte 5 compatibility
- [Phase phase-2]: AtomicU64 rate limiter for arXiv: const-capable, no Mutex overhead
- [Phase phase-2]: quick-xml event reader over serde derive: reliable Atom namespace handling
- [Phase 04-llm]: relative imports (../types/llm) not $lib — path alias not configured in project
- [Phase 04-llm]: registerContextGetter pattern for circular dep prevention (chat ↔ context-selection)
- [Phase 04-llm]: tabbed MainPanel (Chat/Papers) to preserve Phase 2 PaperDetail integration
- [Phase 04-llm]: js-tiktoken uses encodingForModel (camelCase) not encoding_for_model
- [Phase phase-3]: lazy import('chat-persistence') in triggerAutoSave to prevent circular module dep
- [Phase phase-3]: pdfjs-dist@3.11 stable Vite worker pattern over v4 mjs API
- [Phase phase-3]: SVG overlay for annotations: interactive elements, no hit-testing
- [Phase phase-3]: Annotations stored in PDF coordinate space, canvas transform at render
- [Phase phase-3]: JSON sidecar {pdf}.annotations.json co-located with PDF file

### Key v0.2.0 Architecture Decisions

- Document model: Markdown files in `{workspace}/documents/{docId}.md` with JSON sidecar for links
- Linking system: Obsidian-style `[[paper-id]]` syntax with validation and orphan handling
- Suggestions: TipTap extension with ghost text decoration, 500ms debounce, streaming from Ollama/OpenAI
- Editor consistency: CodeMirror editor used for documents (same UX as notes/papers)
- Link storage: JSON sidecars (`{docId}.links.json`) for bidirectional link tracking
- Backlinks: In-memory Map loaded on document open (O(1) query performance)
- Export: Leverage existing Tectonic pipeline for PDF generation

### Pending Todos

None yet (roadmap creation complete).

### Blockers/Concerns

None yet.

## Session Continuity

Last session: 2026-04-08 (v0.2.0 roadmap creation)
Stopped at: Roadmap complete, 4 phases identified, 27/27 requirements mapped
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
- **v0.2.0 specific:**
  - TipTap extension APIs for inline suggestions and decorations
  - JSON sidecar pattern for bidirectional linking
  - Obsidian-style backlink architecture
  - Streaming suggestion integration with existing LLM infrastructure

Research files available in research/ directory for reference during planning.
