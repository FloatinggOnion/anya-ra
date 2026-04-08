# Anya-RA (Research Assistant)

## What This Is

A cross-platform desktop application (macOS, Windows, Linux) built with Tauri that serves as an integrated research assistant. Researchers start from a folder, define a topic, discover and download papers (from arXiv, Semantic Scholar, PubMed, or their own files), then read, annotate, map, and write — all in one place, with a local LLM (Ollama/Qwen3.5 0.8B by default) or cloud APIs assisting throughout. Designed for both academic and independent researchers who are tired of jumping between scattered tools.

## Core Value

Every step of the research loop — discover, read, annotate, map, write — happens in one fast, integrated application without switching tools.

## Current Milestone: v0.2.0 Enhanced Interactive Writing

**Goal:** Enable researchers to write standalone literature reviews with AI-assisted suggestions, paper references, and bidirectional linking between documents, papers, and notes.

**Target features:**
- Freeform literature review editor (standalone documents)
- Paper references within documents with citation/linking
- Obsidian-style bidirectional linking (papers ↔ documents, papers ↔ notes)
- Inline AI suggestions while typing (context-aware from selected papers)
- Chat pane with relevant paper context and suggestions

---

## Previous State (v0.1.12)

**Shipped:**
- Tauri + Svelte 5 foundation with workspace folder selection
- Tabbed MainPanel architecture (Chat, Papers, PDF, Graph, Notes tabs)
- Full LLM chat interface with Ollama (qwen2:0.5b) and OpenAI fallback
- Streaming responses with 3-wave wave execution
- Context selection UI with token budgeting (tiktoken)
- Draft section suggestions with accept/reject UI
- Chat persistence with auto-save (300ms debounce)
- Research notes editor (CodeMirror 6, markdown syntax highlighting)
- Notes auto-save and export to PDF/DOCX with metadata
- Knowledge graph (@xyflow/svelte canvas, 3 node types, Rust persistence)
- Workspace export as ZIP with full-text search and HTML rendering

## Requirements

### Validated

- ✓ Cross-platform desktop app via Tauri (macOS, Windows, Linux) — v0.1.12
- ✓ Folder-based workspace: each project lives in a user-chosen directory — v0.1.12
- ✓ Built-in PDF viewer with annotation support — v0.1.12 (highlight, underline, sticky notes)
- ✓ Notes system: markdown editor with auto-save and export — v0.1.12
- ✓ Knowledge graph: @xyflow canvas with custom node types — v0.1.12
- ✓ Chat interface with user-selectable context (papers, notes, graph, draft) — v0.1.12
- ✓ LLM backend: Ollama (qwen2:0.5b) + OpenAI fallback — v0.1.12
- ✓ LLM behavior: autonomous suggestions (accept/reject), draft sections on request — v0.1.12
- ✓ Speed optimizations: bundle optimization, lazy loading, compression — v0.1.12

### Active

- [ ] Paper discovery via arXiv, Semantic Scholar, PubMed (paywall papers flagged, not downloaded)
- [ ] Import local PDFs into workspace
- [ ] LaTeX-capable text editor for writing literature reviews
- [ ] Export: PDF, LaTeX, TXT (DOCX partial)
- [ ] Minimalist dark/light mode (light = black-and-white brutalist)
- [ ] Enhanced performance: target <100ms UI response, <2s app startup

### Out of Scope

- Full document generation by LLM — LLM drafts sections only, never the full review
- Downloading paywalled papers — flag and show link instead
- Citation management as primary function (this is a thinking/writing tool, not a reference manager)
- Mobile app — desktop only

## Context

The problem this solves: researchers currently use Zotero for references, a separate PDF reader, a separate note-taking app, and a separate writing tool. None of these talk to each other, and none have integrated AI that knows about the actual papers being worked on.

The local-first architecture (Tauri, Ollama) means no cloud dependency by default. Papers and notes stay on the user's machine in the folder they started in. Cloud LLMs are opt-in via user-provided API keys.

Performance is explicitly a design constraint: the app should feel faster than the web-based tools researchers currently use.

## Constraints

- **Tech Stack**: Tauri (Rust backend + web frontend), Ollama for local LLM, REST calls for cloud LLM APIs
- **LLM Default**: Qwen3.5 0.8B via Ollama — must run on modest hardware; larger models optional
- **Paper Sources**: arXiv, Semantic Scholar, PubMed — open access only; paywall content flagged with name + link
- **Storage**: All data stored locally in the workspace folder; no cloud sync by default
- **Performance**: UI responsiveness is a first-class concern, not an afterthought

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Tauri over Electron | Smaller binaries, faster startup, Rust backend for perf-critical work | ✓ Good — Tauri v2 with Svelte 5 working well, fast startup confirmed |
| Ollama as LLM runtime | Clean separation of concerns, user manages models, no bundled binary bloat | ✓ Good — qwen2:0.5b runs smoothly on modest hardware, OpenAI fallback working |
| Folder-based workspaces | Files stay where researchers expect them; no proprietary database lock-in | ✓ Good — all data (notes, PDFs, metadata) persists in workspace folder with JSON sidecars |
| LLM assists, never automates | Quality of literature review depends on researcher judgment, not LLM output | ✓ Good — draft section suggestions with accept/reject UI implemented, user retains full control |
| Tabbed MainPanel over modal overlays | Cleaner UI, easier context switching between papers/chat/notes | ✓ Good — tabbed interface is snappy, no loading delays between tabs |
| Wave-based execution (GSD) | Parallel work on independent tasks, faster delivery | ✓ Good — 3-wave structure for LLM phase delivered all features with minimal conflicts |

---
*Last updated: 2026-04-08 after v0.1.12 milestone completion*
