---
phase: 09-conservative-inline-suggestions
plan: 05
subsystem: citations
tags: [citation-formatting, telemetry, settings, vitest, tdd]

# Dependency graph
requires:
  - phase: 09-04
    provides: "CitationStyle type, SidebarSuggestionItem, PaperMatch, updated SuggestionSettings with citationStyle/sidebarLayout"
provides:
  - "SmartCitationInsert service: contextual citation generation with three styles"
  - "FRAMING_PHRASES rotation for varied citations (D-06)"
  - "reformatDocumentCitations: retroactive citation reformat on style change (D-07)"
  - "Settings convenience setters: setCitationStyle(), setSidebarLayout()"
  - "Telemetry recordInsertion() for click-to-insert tracking (D-11)"
affects: [09-06-sidebar-ui, document-editor]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Unified-pass regex replacement with reverse-order sort for safe multi-match reformatting"
    - "Framing phrase rotation via per-paper Map index (getFramingText)"
    - "Svelte get(store) pattern for reading settings in service functions"

key-files:
  created:
    - "src/lib/services/smart-citation-insert.ts - Citation generation + retroactive reformatting"
    - "src/lib/services/smart-citation-insert.test.ts - 18 tests (11 format + 7 reformat)"
  modified:
    - "src/lib/stores/settings.ts - CitationStyle import + setCitationStyle/setSidebarLayout"
    - "src/lib/stores/telemetry.ts - recordInsertion + getInsertionCount"

key-decisions:
  - "Unified single-pass replacement approach instead of two-phase (avoided double-processing of pass-1 output by pass-2)"
  - "Bare footnote detection regex added to handle footnote citations without cite tags"
  - "FRAMING_PHRASES rotation uses modulo (idx % length) for cycling through 8 phrases"

patterns-established:
  - "Service functions read settings via get(settings) for Svelte store access outside components"

requirements-completed:
  - SUGG-05
  - LLM-MULTI-02

# Metrics
duration: 17 min
completed: 2026-05-22
---

# Phase 9 Plan 5: SmartCitationInsert with Retroactive Reformatting Summary

**SmartCitationInsert service with three citation styles, framing text variety, retroactive style-change reformatting, settings convenience setters, and telemetry click-to-insert tracking**

## Performance

- **Duration:** 17 min
- **Started:** 2026-05-22T00:51:01Z
- **Completed:** 2026-05-22T01:07:50Z
- **Tasks:** 4
- **Files modified:** 4

## Accomplishments

- SmartCitationInsert service generates author-year (with varied framing), cite-title, and footnote citations
- FRAMING_PHRASES pool of 8 phrases rotates per paper ID for citation variety (D-06)
- reformatDocumentCitations retroactively updates all `[cite: ...]` citations when style changes (D-07)
- Bare footnote citations (without cite tags) are detected and reformatted alongside cite-tagged citations
- Settings store now has `setCitationStyle()` and `setSidebarLayout()` convenience setters
- Telemetry store tracks click-to-insert events via `recordInsertion()` with opt-in guard (D-11)

## Task Commits

Each task was committed atomically (TDD tasks: RED → GREEN):

1. **Task 1 RED: SmartCitationInsert tests** - `5ac7229` (test)
2. **Task 1 GREEN: SmartCitationInsert implementation** - `93d1f57` (feat)
3. **Task 2: Settings store citation style + sidebar layout** - `794dfca` (feat)
4. **Task 3: Telemetry recordInsertion** - `054c91b` (feat)
5. **Task 4 RED: reformatDocumentCitations tests** - `4b56811` (test)
6. **Task 4 GREEN: reformatDocumentCitations implementation** - `1979b58` (feat)

## Files Created/Modified

- `src/lib/services/smart-citation-insert.ts` - Core citation service: `formatAuthorName`, `formatPaperCitation`, `generateCitation`, `reformatDocumentCitations`, `getCitationStyle`, `_resetFramingState`
- `src/lib/services/smart-citation-insert.test.ts` - 18 tests: 5 author name, 5 paper citation (3 styles + null year + framing variety), 2 generateCitation, 6 reformatDocumentCitations
- `src/lib/stores/settings.ts` - Added `CitationStyle` import, `setCitationStyle()`, `setSidebarLayout()` convenience setters
- `src/lib/stores/telemetry.ts` - Added `recordInsertion()` and `getInsertionCount()` functions

## Decisions Made

1. **Unified single-pass replacement:** Instead of two-phase processing (Pass 1: bare footnotes, Pass 2: cite tags), used a single collection + reverse-sort pass. This eliminated a double-processing bug where Pass 2 would re-process Pass 1's output and add duplicate whitespace.

2. **Bare footnote detection:** Added regex-based detection for footnote-style citations without `[cite: ...]` tags. The plan's test specification (Test 14) required this, but the plan's `<action>` implementation only handled cite-tagged citations. This was applied as a Rule 2 (missing critical functionality) fix.

3. **Reverse-sort over reverse-for:** Used `replacements.sort((a, b) => b.start - a.start)` instead of iterating `matchAll` results in reverse — required because the unified collection combines matches from two different regex passes with different position orders.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing Critical] Added bare footnote citation detection**
- **Found during:** Task 4 (reformatDocumentCitations implementation)
- **Issue:** Test 14 specifies content `'Smith, Jones et al. (2020), "Test Paper". '` without a `[cite: ...]` tag, but the plan's `<action>` implementation only searches for cite tags via `citeRegex`. Bare footnotes would never be detected.
- **Fix:** Added a second detection pass using `bareFootnoteRegex` to find footnote-style citations without cite tags. The unified collection merges both cite-tagged and bare footnote matches, then applies replacements in reverse position order.
- **Files modified:** `src/lib/services/smart-citation-insert.ts`
- **Verification:** Test 14 passes: bare footnote `'Smith, Jones et al. (2020), "Test Paper". '` correctly reformats to `' [cite: Test Paper] '`
- **Committed in:** `1979b58` (Task 4 GREEN commit)

**2. [Rule 1 - Bug] Fixed double-processing in two-pass approach**
- **Found during:** Task 4 (Green phase testing)
- **Issue:** Initial two-pass implementation caused Pass 2 to re-process citations that Pass 1 already reformatted. The leading space from `formatPaperCitation(paper, 'cite-title')` (which returns ` [cite: Title] `) was preserved as `textBefore` in Pass 2, creating double-spacing: `  [cite: Title] `
- **Fix:** Restructured to unified single-pass: collect all citation matches (cite-tagged + bare footnote) into one array, sort by position descending, apply replacements in one pass.
- **Files modified:** `src/lib/services/smart-citation-insert.ts`
- **Verification:** All 18 tests pass including Test 12, 13, 14 (multi-style reformatting with correct spacing)
- **Committed in:** `1979b58` (Task 4 GREEN commit)

---

**Total deviations:** 2 auto-fixed (1 missing critical, 1 bug)
**Impact on plan:** Both fixes essential for correct test 14 behavior. The unified-pass refactoring improved robustness without changing the API surface. No scope creep.

## Issues Encountered

- Pre-existing `tsc --noEmit` errors from project-wide `lib` configuration (ES2015+ required) — out of scope for this plan
- Plan acceptance criteria grep counts slightly mismatched actual implementation counts (e.g., `citeRegex` appears 2 times, plan says 1) — criteria were approximate; all functional behavior verified

## Next Phase Readiness

- SmartCitationInsert service ready for Wave 2 UI wiring (plan 09-06)
- Settings store exposes `setCitationStyle()` and `setSidebarLayout()` that UI can call
- Telemetry store ready for `recordInsertion()` calls from DocumentEditor click handlers
- All exports documented and tested; Paper store and settings store patterns confirmed

---
*Phase: 09-conservative-inline-suggestions*
*Completed: 2026-05-22*
