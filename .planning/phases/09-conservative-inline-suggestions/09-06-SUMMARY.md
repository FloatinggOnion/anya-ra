---
phase: 09-conservative-inline-suggestions
plan: 06
subsystem: ui
tags: [svelte5, codemirror, sidebar, suggestion, keyword-matching, citation-insert, telemetry]
gap_closure: true

# Dependency graph
requires:
  - phase: 09-04
    provides: PaperKeywordMatcher, SectionBoundaryDetector, SuggestionSidebarStore, SuggestionService generateIdeas/generateCompletions
  - phase: 09-05
    provides: SmartCitationInsert, settings citationStyle/sidebarLayout, telemetry recordInsertion
provides:
  - SuggestionsSidebar.svelte: 280px companion pane with three collapsible sections
  - DocumentEditor integration: split layout with sidebar on right, click-to-insert via CustomEvent
  - NotesEditor purity: cleaned of all suggestion/ghost-text code
  - Cursor tracking: onCursorChange prop wired via CodeMirror updateListener
  - Fallback toast: provider fallback notification via showToast service
  - Sidebar styles: suggestions.css replaced with sidebar-focused CSS (ss-section, ss-card, ss-loading)
affects: [future verification phases, any UI work touching DocumentEditor]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Window-level CustomEvent for sidebar-to-editor communication (suggestion-insert)"
    - "Local $state as primary UI state with store functions as side-effects"
    - "CodeMirror updateListener for cursor position tracking"
    - "Split layout: .editor-layout > .editor-main + SuggestionsSidebar"

key-files:
  created:
    - src/lib/components/suggestion/SuggestionsSidebar.svelte
  modified:
    - src/lib/components/document/DocumentEditor.svelte
    - src/lib/components/editor/NotesEditor.svelte
    - src/lib/components/editor/SuggestionDecorations.ts
    - src/lib/styles/suggestions.css

key-decisions:
  - "Used local $state variables instead of syncing from sidebar store (store uses plain variables, not Svelte 5 runes — reactive sync pattern would not work)"
  - "Removed recordInsertion from sidebar click handlers; DocumentEditor's event listener is the single authoritative recording point (avoids double-counting telemetry)"
  - "Used existing showToast service for fallback notification instead of inline DOM manipulation"
  - "Kept EditorView import in NotesEditor (still used for EditorView.theme())"

requirements-completed:
  - SUGG-03
  - SUGG-04
  - SUGG-05
  - SUGG-07
  - UX-04

# Metrics
duration: 12 min
completed: 2026-05-22
---

# Phase 9 Plan 6: Sidebar Companion UI Integration Summary

**Replace ghost-text auto-complete model with 280px sidebar companion pane featuring continuous paper suggestions, boundary-triggered ideas/completions, click-to-insert with contextual citations, and fallback toast notifications.**

## Performance

- **Duration:** 12 min
- **Started:** 2026-05-22T02:16:00+01:00
- **Completed:** 2026-05-22T02:27:41+01:00
- **Tasks:** 2
- **Files modified:** 5 (1 created, 4 modified)

## Accomplishments

- Built SuggestionsSidebar.svelte with 280px companion pane, three collapsible sections (Papers, Ideas, Completions), layout toggle (sectioned/unified), and Suggest button
- Wired continuous paper suggestions via PaperKeywordMatcher Tier 1 keyword matching (no LLM cost, D-05)
- Wired boundary-triggered ideas/completions via SectionBoundaryDetector (two newlines + 500ms pause) and manual Suggest button (D-04)
- Integrated sidebar into DocumentEditor with split layout — editor-main on left, SuggestionsSidebar on right
- Implemented click-to-insert flow: sidebar dispatches `suggestion-insert` CustomEvent, DocumentEditor inserts text at cursor with telemetry recording
- Added `onCursorChange` prop to NotesEditor, wired via CodeMirror `updateListener` for cursor position tracking
- Replaced fallback `console.log` with `showToast` notification for multi-provider fallback events (gap 7 closure)
- Implemented loading spinners in sidebar sections during LLM generation (SUGG-07)
- Replaced all `suggestions.css` ghost-text styles with sidebar-focused styles including `ss-card`, `ss-section`, `ss-loading` with spinner animation, `ss-fade-in` card animation, and generating state pulse indicator

## Task Commits

Each task was committed atomically:

1. **Task 1: Clean up NotesEditor — remove all suggestion and ghost-text code** - `c68fade` (feat)
2. **Task 2: Build SuggestionsSidebar component + integrate into DocumentEditor + replace CSS** - `573cb35` (feat)

## Files Created/Modified

- `src/lib/components/suggestion/SuggestionsSidebar.svelte` - 280px right sidebar with three collapsible sections, keyword matching, boundary detection, click-to-insert
- `src/lib/components/document/DocumentEditor.svelte` - Split layout with sidebar, cursor tracking, suggestion-insert event listener, fallback toast, removed old suggestion code
- `src/lib/components/editor/NotesEditor.svelte` - Added onCursorChange prop with CodeMirror updateListener; already clean of suggestion code from Task 1
- `src/lib/components/editor/SuggestionDecorations.ts` - Stripped to no-op StateField placeholder with DEPRECATED marker
- `src/lib/styles/suggestions.css` - Replaced ghost-text/block-widget styles with sidebar-focused styles (280px pane, sections, cards, spinners, animations)

## Decisions Made

- **Local $state vs store sync:** The `suggestion-sidebar.ts` store uses plain module-level variables (not Svelte 5 runes), so the plan's `$effect` store sync pattern would not be reactive. Used local `$state` variables as primary UI state, calling store functions as side-effects for external consumers. This is a Rule 1 deviation from the plan's proposed implementation pattern.
- **Single telemetry recording point:** Removed `recordInsertion` calls from the sidebar's click handlers. The DocumentEditor's `suggestion-insert` event listener is the single authoritative recording point, preventing double-counting. This is a Rule 1 deviation (bug fix).
- **Toast service reuse:** Used the existing `showToast` service (imported from `../../services/toast`) instead of inline DOM manipulation for the fallback notification, consistent with the project's existing notification pattern.
- **EditorView import preserved:** Kept even though `findFromDOM` usage was removed — `EditorView.theme()` still requires it.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] SuggestionsSidebar store sync pattern not reactive with current store implementation**
- **Found during:** Task 2 (SuggestionsSidebar construction)
- **Issue:** Plan specified a `$effect` that reads from `sidebarPapers.current` getters to sync local state. The store uses plain module-level variables (not Svelte 5 `$state` runes), so getter access creates no reactive tracking — the effect would only fire once on mount.
- **Fix:** Used local `$state` variables as the primary UI state source. Store functions (`setPaperMatches`, `setIdeas`, `setCompletions`) are still called as side-effects for external consumers, but the component's UI is driven by its own reactive local state.
- **Files modified:** `src/lib/components/suggestion/SuggestionsSidebar.svelte`
- **Verification:** TypeScript compiles clean; all sections render from local state

**2. [Rule 1 - Bug] Removed duplicate telemetry recording (recordInsertion called in both sidebar and DocumentEditor)**
- **Found during:** Task 2 (SuggestionsSidebar construction)
- **Issue:** Plan included `recordInsertion` calls in both the sidebar's `handlePaperClick`/`handleCompletionClick` handlers AND DocumentEditor's `suggestion-insert` event listener. This would double-count every click-to-insert event.
- **Fix:** Removed `recordInsertion` from sidebar handlers. DocumentEditor's event listener is the single authoritative recording point, called after successful text insertion.
- **Files modified:** `src/lib/components/suggestion/SuggestionsSidebar.svelte`
- **Verification:** `recordInsertion` appears exactly once in the call path — inside DocumentEditor's `handleSuggestionInsert`

**3. [Rule 1 - Bug] Removed unused `generateCitation` import from DocumentEditor**
- **Found during:** Task 2 (DocumentEditor update)
- **Issue:** Plan instructed importing `generateCitation` in DocumentEditor, but the component never calls it directly — it receives pre-formatted citation text via the `suggestion-insert` CustomEvent from the sidebar.
- **Fix:** Removed the unused import to keep the module clean.
- **Files modified:** `src/lib/components/document/DocumentEditor.svelte`
- **Verification:** TypeScript compiles without unused import warnings

**4. [Rule 3 - Blocking] Used existing `showToast` service instead of inline DOM approach for fallback notification**
- **Found during:** Task 2 (DocumentEditor fallback toast)
- **Issue:** Plan suggested checking for a toast service, with fallback to inline DOM manipulation. The project already has a `showToast` service (`src/lib/services/toast.ts`) used by DocumentsSidebar and other components.
- **Fix:** Imported and used the existing `showToast(message, 'info', 5000)` for the provider chain fallback callback, consistent with the project's notification pattern.
- **Files modified:** `src/lib/components/document/DocumentEditor.svelte`
- **Verification:** `showToast` import present; fallback callback calls `showToast` with appropriate message and duration

---

**Total deviations:** 4 auto-fixed (3 Rule 1 bugs, 1 Rule 3 blocking)
**Impact on plan:** All deviations are corrective — they fix implementation issues in the plan's design (reactive sync pattern, duplicate telemetry) and improve code quality (unused imports, proper service reuse). No scope creep.

## Issues Encountered

None — plan executed smoothly with minor design corrections documented above.

## User Setup Required

None — no external service configuration required.

## Known Stubs

None. The only placeholder text is the intentional DEPRECATED marker in `SuggestionDecorations.ts`, which serves a clear purpose (preventing import errors in unrefactored paths).

## Threat Flags

All new surface (CustomEvent dispatch/listen, content as read-only prop, DOM-free toast notification) is covered by the plan's existing threat model (T-09-24 through T-09-29). No additional threat flags.

## Verification Gaps Closed

All 8 VERIFICATION gaps from the 09-03 checklist have been addressed:

| Gap | Description | Status |
|-----|-------------|--------|
| 1 | Suggestion sidebar pane (280px) missing | ✅ Closed — SuggestionsSidebar at 280px in editor-layout |
| 2 | Paper suggestions via keyword matching not wired | ✅ Closed — PaperKeywordMatcher.match() in $effect |
| 3 | Ideas/completions generation not wired | ✅ Closed — SectionBoundaryDetector + manual Suggest button |
| 4 | Click-to-insert not wired in DocumentEditor | ✅ Closed — suggestion-insert CustomEvent listener |
| 6 | Sectioned/unified toggle missing | ✅ Closed — toggleLayout with setSidebarLayout persistence |
| 7 | Fallback toast (partial — console.log → toast) | ✅ Closed — showToast service for provider fallback |
| 8 | Loading spinners in sidebar missing | ✅ Closed — ss-loading with spinner animation |
| 10 | Telemetry wiring on click-to-insert | ✅ Closed — recordInsertion in DocumentEditor event listener |

## Next Phase Readiness

Phase 9 plans 09-04, 09-05, and 09-06 are now complete. The sidebar companion UI is fully integrated. Ready for phase-level verification (gsd-verify-work) to validate all success criteria end-to-end.

---

*Phase: 09-conservative-inline-suggestions*
*Completed: 2026-05-22*
