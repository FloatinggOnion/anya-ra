# Anya-RA (Research Assistant)

## What This Is

A cross-platform desktop application (macOS, Windows, Linux) built with Tauri that serves as an integrated research assistant. Researchers start from a folder, define a topic, discover and download papers (from arXiv, Semantic Scholar, PubMed, or their own files), then read, annotate, map, and write — all in one place, with a local LLM (Ollama/Qwen3.5 0.8B by default) or cloud APIs assisting throughout. Designed for both academic and independent researchers who are tired of jumping between scattered tools.

## Core Value

Every step of the research loop — discover, read, annotate, map, write — happens in one fast, integrated application without switching tools.

## Requirements

### Validated

(None yet — ship to validate)

### Active

- [ ] Cross-platform desktop app via Tauri (macOS, Windows, Linux)
- [ ] Folder-based workspace: each project lives in a user-chosen directory
- [ ] Paper discovery via arXiv, Semantic Scholar, PubMed (paywall papers flagged, not downloaded)
- [ ] Import local PDFs into workspace
- [ ] Built-in PDF viewer with annotation support
- [ ] Notes system: each note has a backlink to exact PDF page/section/line
- [ ] Knowledge graph: freeform nodes (papers, ideas, notes), user-drawn edges
- [ ] LaTeX-capable text editor for writing literature reviews
- [ ] Export: PDF, LaTeX, TXT, DOCX
- [ ] Chat interface with user-selectable context (papers, notes, graph, draft)
- [ ] LLM backend: Ollama (local, default Qwen3.5 0.8B) + cloud APIs (OpenAI, Anthropic, etc.)
- [ ] LLM behavior: autonomous suggestions (accept/reject), draft sections on request, conversational
- [ ] Minimalist dark/light mode (light = black-and-white brutalist)
- [ ] Speed as top-level priority: fast startup, instant UI, snappy interactions

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
| Tauri over Electron | Smaller binaries, faster startup, Rust backend for perf-critical work | — Pending |
| Ollama as LLM runtime | Clean separation of concerns, user manages models, no bundled binary bloat | — Pending |
| Folder-based workspaces | Files stay where researchers expect them; no proprietary database lock-in | — Pending |
| LLM assists, never automates | Quality of literature review depends on researcher judgment, not LLM output | — Pending |

---
*Last updated: 2026-03-11 after initialization*
