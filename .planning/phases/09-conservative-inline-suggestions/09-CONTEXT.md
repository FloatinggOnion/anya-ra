# Phase 9: Conservative Inline Suggestions - Context

**Gathered:** 2026-05-21
**Status:** Ready for planning

<domain>
## Phase Boundary

This phase delivers a non-invasive AI writing assistant that lives in a sidebar pane alongside the document editor. The agent suggests paper references, ideas/questions, and text completions — but NEVER inserts text into the document without explicit user action. The user writes; the agent assists from the sidelines.

This is a fundamental UX rethink from the prior 09-CONTEXT.md (2026-04-11) which defined a ghost-text auto-completion model. The new model replaces ghost text entirely with a sidebar companion.
</domain>

<decisions>
## Implementation Decisions

### Suggestion Display (overrides old Areas 1 & 2)

- **D-01: Right sidebar pane, always visible.** Suggestions live in a docked pane to the right of the editor. Always present, never blocks the document. User can ignore it or engage with it.
- **D-02: Three suggestion types.** The pane shows three categories: (1) Paper references — papers from the user's library that relate to the current writing; (2) Ideas & questions — concepts, counterarguments, follow-up questions based on context; (3) Text completions — sentence/phrase continuations the user can pull in.
- **D-03: Sectioned layout, user-switchable.** Sections (Papers / Ideas / Completions) are the default view, each collapsible. User can switch to a unified feed mixing all three. Not tabbed — all three sections visible simultaneously in default mode.
- **D-04: Hybrid timing.** Paper references update continuously via local keyword search (no LLM cost). Ideas and text completions trigger in two ways: (a) the agent detects section boundaries (e.g., two line breaks, paragraph end) and auto-generates into the sidebar; (b) a "Suggest" button in the sidebar lets the user manually trigger generation. No background LLM calls without either a boundary detection or user intent.

### Reference Insertion

- **D-05: Two-tier paper matching.** Tier 1: continuous keyword match against the papers store (title, authors, abstract) — fast and free. Tier 2: on-demand or section-boundary semantic match via LLM re-ranks keyword results for deeper relevance.
- **D-06: Smart insert on user click.** Clicking a suggested paper in the sidebar inserts a contextual citation with surrounding framing text into the document at cursor position. Example: "As demonstrated by Vaswani et al. [cite: Attention Is All You Need], ..." The user can edit the framing text after insertion.
- **D-07: User-configurable citation style.** User chooses preferred citation format (author-year inline, [cite: Title], footnote/superscript). Changing the style preference updates all citations in the current document. This is a per-document or global setting — planner decides.

### Agent Role Boundary

- **D-08: Never insert text automatically.** The agent's cardinal rule: nothing ever appears in the document without an explicit user click/action. The sidebar can auto-populate freely. The document is sacred.
- **D-09: Sidebar always visible.** The suggestions pane is part of the default editor layout. No need to open/close it. It's a companion, not a tool you summon.

### Preserved from Prior 09-CONTEXT.md (2026-04-11)

- **D-10: Multi-provider fallback chain.** User selects primary provider (Ollama or OpenRouter). If the primary fails with a recoverable error, auto-fallback to the other provider. Toast notification on fallback. Retry primary on next request. (Old Area 3 — preserved)
- **D-11: Local-only opt-in telemetry.** Track suggestion acceptance rate locally in `.anya/telemetry.json`. Disabled by default. Opt-in via Settings toggle. No network transmission. (Old Area 4 — preserved)

### Agent's Discretion

The planner can decide:
- Exact sidebar pane component architecture (new component vs. extending existing)
- Section boundary detection heuristics (what constitutes a "section boundary")
- Keyword matching algorithm for Tier 1 paper suggestions
- Settings page structure for citation style and suggestion preferences
- Whether citation style is per-document or global
</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Phase Context & Requirements
- `.planning/ROADMAP.md` §Phase 9 — Success criteria, requirements, architecture notes
- `.planning/REQUIREMENTS.md` §SUGG, UX-04, LLM-MULTI — Requirements for suggestions, multi-provider
- `.planning/PROJECT.md` — Core value, constraints (LLM assists never automates)
- `.planning/phases/08-CONTEXT.md` — Phase 8 decisions: document storage pattern, CodeMirror editor, `[cite: Title]` syntax, sidebar list pattern
- `.planning/phases/09-conservative-inline-suggestions/09-CONTEXT.md` — Old context (2026-04-11): preserved decisions D-10, D-11; everything else is SUPERSEDED by this document

### Codebase (existing implementation)
- `src/lib/components/document/DocumentEditor.svelte` — Current editor with suggestion integration, auto-save, citation validation
- `src/lib/components/editor/NotesEditor.svelte` — CodeMirror 6 wrapper, suggestion decoration rendering
- `src/lib/components/editor/SuggestionDecorations.ts` — Ghost text and block suggestion widgets (will be REPLACED by sidebar approach)
- `src/lib/services/suggestions.ts` — SuggestionService: debounce, auto-cancel, context building, streaming
- `src/lib/services/suggestion-provider-chain.ts` — Multi-provider fallback chain (PRESERVED — D-10)
- `src/lib/types/suggestion.ts` — Suggestion, SuggestionSettings, TelemetryRecord types
- `src/lib/components/document/DocumentsSidebar.svelte` — Document list sidebar (reference pattern for new suggestion sidebar)
- `src/lib/components/document/DocumentCreateDialog.svelte` — Document creation dialog (PRESERVED — not changed in this phase)
- `src/lib/stores/documents.ts` — Document store, selectedDocumentId, currentDocument
- `src/lib/stores/telemetry.ts` — Local telemetry store (PRESERVED — D-11)
- `src/lib/stores/llm-provider.ts` — Provider state, switchProvider, initializeProvider

### Styles
- `src/lib/styles/suggestions.css` — Ghost text and block suggestion CSS (will be EXTENDED/REPLACED with sidebar styles)
</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- **DocumentsSidebar.svelte** — Existing sidebar pattern with search, list, create button. The new suggestion sidebar can follow a similar component structure but for suggestion items instead of document list items.
- **SuggestionService + SuggestionProviderChain** — The streaming, debounce, abort, and fallback infrastructure is built and tested. The new sidebar model changes WHERE suggestions render, not HOW they're generated. The service layer is largely reusable.
- **SuggestionDecorations state field** — CodeMirror StateField pattern for managing suggestion state can be adapted to manage the suggestion sidebar data model, or replaced with a Svelte 5 $state-based approach.
- **ContextSelection.svelte** — Existing chat context selection UI already lets users pick papers/notes for context. The sidebar suggestion system reuses this same context pipeline (selectedItems store).

### Established Patterns
- **Debounced auto-save (300ms)** — DocumentEditor.svelte:131-142. Same debounce pattern used for suggestions. Reuse for sidebar refresh timing.
- **JSON sidecar pattern** — `.links.json` files alongside `.md` documents. Same pattern for `.telemetry.json`.
- **Svelte 5 $state + $effect** — DocumentEditor uses runes for reactive content, auto-save, and suggestion triggering. Sidebar pane should follow the same approach.
- **Provider initialization pattern** — onMount → initializeProvider → $effect watches providerState → initialize SuggestionService. This chain should be preserved.

### Integration Points
- **DocumentEditor.svelte** — The suggestion sidebar replaces the existing `suggestion={currentSuggestion}` prop passed to NotesEditor. The sidebar is a sibling component to NotesEditor, not a child.
- **NotesEditor.svelte** — Remove the suggestion prop entirely. NotesEditor goes back to being a pure editor.
- **SuggestionDecorations.ts** — The entire file (ghost text, block widgets) is superseded. Suggestions no longer render as CodeMirror decorations.
- **DocumentsSidebar.svelte** — Unchanged document management sidebar (left). New suggestion pane (right) is a separate component.
</code_context>

<specifics>
## Specific Ideas

- The sidebar should feel like an "AI companion" — not a tool panel, not a debug console. Think: a thoughtful colleague reading over your shoulder who occasionally says "have you considered citing X here?" or "what about the counterargument?"
- Section boundary detection for auto-trigger: when the user types two consecutive newlines (paragraph break) and pauses briefly, the agent refreshes ideas and text completions. This should feel ambient, not like an interruption.
- The "Suggest" button in the sidebar should be visible but understated — not a primary CTA. The agent's value is in being available, not in demanding attention.
</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope. The document creation flow (dialog) was not changed; that remains as implemented in Phase 8.
</deferred>

---

*Phase: 09-conservative-inline-suggestions*
*Context gathered: 2026-05-21*
