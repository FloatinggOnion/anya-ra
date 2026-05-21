# Phase 9: Conservative Inline Suggestions - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-05-21
**Phase:** 09-conservative-inline-suggestions
**Areas discussed:** How suggestions appear, Reference insertion, Agent role boundary

---

## How Suggestions Appear

### Where should suggestions live in the UI?

| Option | Description | Selected |
|--------|-------------|----------|
| Right sidebar pane | Docked pane to the right of the editor, always visible | ✓ |
| Floating popover | Small floating panel near cursor | |
| Bottom status bar / drawer | Slim horizontal panel below editor | |

**User's choice:** Right sidebar pane, always visible and docked.

### What kind of suggestions?

| Option | Description | Selected |
|--------|-------------|----------|
| Paper references | Papers from library that relate to current writing | ✓ |
| Ideas & questions | Concepts, counterarguments, follow-up questions | ✓ |
| Text continuations | Sentence/phrase completions user can insert | ✓ |

**User's choice:** All three — paper references, ideas & questions, and text continuations.

### When should suggestions appear?

| Option | Description | Selected |
|--------|-------------|----------|
| Continuous refresh | Pane updates on every keystroke (debounced) | |
| On pause only | Only when user explicitly clicks Suggest or presses shortcut | |
| Hybrid | Papers continuous (local search, cheap); ideas+completions via section-boundary auto-detect AND manual button (LLM, expensive) | ✓ |

**User's choice:** Hybrid. Two tiers — paper references refresh continuously via local keyword search (no LLM cost). Ideas and text completions trigger at section boundaries (auto-detect) and via a manual "Suggest" button.

**Notes:** The user asked to check the code to identify the right approach. The existing code already has a debounce/abort pattern (SuggestionService) and a separate citation validation system (DocumentEditor 100ms debounce). The hybrid model maps cleanly to these existing systems.

### How should the three types be presented?

| Option | Description | Selected |
|--------|-------------|----------|
| Sectioned | Papers / Ideas / Completions as collapsible sections | ✓ |
| Unified feed | One stream mixing all three | |
| Tabbed | Three tabs, one visible at a time | |

**User's choice:** Sectioned by default with option to switch to unified feed. Not tabbed — all sections visible simultaneously.

---

## Reference Insertion

### How should the agent match papers to what you're writing?

| Option | Description | Selected |
|--------|-------------|----------|
| Semantic match | LLM reads paragraph, finds topically relevant papers | |
| Keyword match | Extract key terms, match against papers store locally | |
| Both — tiered | Keyword continuous (free), semantic re-rank on-demand (LLM) | ✓ |

**User's choice:** Both, tiered. Keyword match runs continuously for free. Semantic match re-ranks results on-demand or at section boundaries.

### How does clicking a suggested paper insert into the document?

| Option | Description | Selected |
|--------|-------------|----------|
| Insert citation at cursor | Drops [cite: Title] at cursor position | |
| Preview then insert | Shows paper card, user confirms insertion | |
| Smart insert | Contextual citation with surrounding framing text | ✓ |

**User's choice:** Smart insert. Clicking inserts a full contextual citation with framing text (e.g., "As demonstrated by Vaswani et al. [cite: Attention Is All You Need], ..."). User can edit the framing after insertion.

### Citation format?

| Option | Description | Selected |
|--------|-------------|----------|
| Keep [cite: Title] | Existing syntax, already validated | |
| Author-year inline | (Author et al., Year) linked format | |
| Footnote style | Superscript number + footnote section | |

**User's choice:** User-configurable. Users can choose their preferred citation style, and changing the preference updates all citations in the document.

**Notes:** This introduces a citation style system not present in the original v0.2.0 scope. It's captured as D-07 in CONTEXT.md — planner decides whether it's per-document or global.

---

## Agent Role Boundary

### What does the agent never do?

| Option | Description | Selected |
|--------|-------------|----------|
| Never insert text | Nothing enters the document without user click. Agent can auto-generate into sidebar freely. | ✓ |
| Never auto-generate | Agent only responds to explicit triggers (button, shortcut, section pause). No background generation. | |
| Never auto-generate nor insert | Both rules: no background generation AND nothing inserts automatically. | |

**User's choice:** Never insert text. The cardinal rule: the sidebar can auto-populate freely, but nothing appears in the document without an explicit user click/action. The document is sacred.

### Should the sidebar pane be visible by default?

| Option | Description | Selected |
|--------|-------------|----------|
| Always visible | Part of the default editor layout, always docked | ✓ |
| Collapsible — closed by default | Hidden until user opens it | |
| Collapsible — open by default | Open by default, toggle to collapse | |

**User's choice:** Always visible. The suggestions pane is a permanent part of the editor layout. No toggle needed — it's a companion, not a tool the user summons.

---

## Deferred Ideas

None — discussion stayed within phase scope. The document creation flow (dialog) was not discussed per user's selection.
