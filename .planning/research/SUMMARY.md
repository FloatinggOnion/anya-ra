# v0.2.0 Research Summary: Enhanced Interactive Writing with AI Assistance

**Milestone:** v0.2.0 — Enhanced Interactive Writing  
**Focus:** Standalone literature review editor with inline AI suggestions and paper linking  
**Research completed:** 2026-04-08

---

## Key Findings

### Stack Additions

**For inline suggestions:**
- TipTap has native extension APIs for implementing suggestion panels and inline decorations
- No additional library needed; use TipTap's `Extension` API with custom JavaScript
- Streaming from Ollama/OpenAI already working; pipe directly to editor render updates
- Keep suggestion rendering in Svelte (reactive updates on stream chunks)

**For bidirectional linking:**
- Store links in JSON sidecars: `{workspace}/documents/{docId}.links.json`
- Mirror existing annotation/note sidecar pattern for consistency
- Query links via in-memory index on document open (fast, no database needed)

**Recommended libraries:**
- `@tiptap/extension-placeholder` (show suggestion hints)
- No new major dependencies needed; leverage existing tech stack

### Features

**Table Stakes (must-have for v0.2.0):**
1. **Standalone documents** — Create freeform literature reviews independent of papers
2. **Paper references** — Link to papers with syntax like `[[paper-id]]` (Obsidian-style)
3. **Inline suggestions** — Context-aware writing assistance triggered while typing
4. **Basic backlinks** — See which papers reference a given paper

**Differentiators (v0.3+):**
- Full text search across documents
- Document templates (methodology, findings, conclusion sections)
- Export to LaTeX/PDF with proper bibliography
- Document version history
- Real-time collaboration (future)

**Anti-features (explicitly exclude):**
- Full document generation from LLM (keep assist-not-automate principle)
- Automatic linking (manual links are more intentional)
- Complex relation databases (keep it simple, JSON)

### Architecture Insights

**Data flow for suggestions:**
```
Document text (cursor position) 
  → extract context (selected papers, surrounding text)
  → LLM prompt (Ollama/OpenAI with streaming)
  → suggestion stream
  → TipTap decorator (inline ghost text)
  → user accepts/rejects/edits
```

**Linking system:**
- Document model: `{ id, title, content, metadata, links: [{target, type, label}] }`
- Link types: `paper-reference`, `backlink`, `note-reference`
- Store in `.links.json` sidecar, load on document open
- Query via in-memory Map for O(1) backlink lookup

**State management:**
- Use Svelte stores for current document, selected papers (context)
- TipTap handles content state internally
- Linking state: in-memory Map, persisted to sidecar on save

### Pitfalls to Avoid

1. **Suggestion overload** — Don't show suggestions on every keystroke; use debounce (500ms) and limit to 1-2 suggestions at a time
2. **Broken links** — When a paper is deleted, orphan its document links (mark as "missing reference")
3. **Suggestion irrelevance** — Ensure selected papers are actually used in prompt context; test early
4. **Performance** — Keep suggestion stream latency <2s visible; use loading indicator
5. **Link maintenance burden** — Keep linking simple (no force-directed graphs for documents); Obsidian-style backlinks are enough

### Recommendations for v0.2.0

**Start with:**
1. Document model and sidecar persistence
2. Simple paper reference syntax `[[paper-id]]` with backlink tracking
3. Inline suggestions with debounce (triggered every 500ms while idle, max 1 suggestion visible)
4. Accept/reject/edit UI for suggestions (ghost text → real on accept)

**Skip for v0.3+:**
- Document templates
- Full export chain (LaTeX/proper bibliography)
- Advanced suggestion tuning (LLM model selection per user)

---

## Sources & Confidence

**High confidence (industry standard):**
- Inline suggestions (GitHub Copilot, VS Code, Claude IDE) — proven UX pattern
- Obsidian-style backlinks — proven with 1M+ users
- TipTap extension API — well-documented, actively maintained

**Medium confidence (research-based):**
- JSON sidecar for bidirectional links (good balance of simplicity vs querying)
- Suggestion debounce timing (500ms) — balance between responsiveness and LLM latency
- In-memory link index — fast enough for typical document sizes

---

**Next step:** Define REQUIREMENTS.md based on these findings, then create ROADMAP.md with phased execution.
