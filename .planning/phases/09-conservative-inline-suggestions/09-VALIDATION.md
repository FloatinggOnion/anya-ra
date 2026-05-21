---
phase: 09
slug: conservative-inline-suggestions
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-05-22
---

# Phase 09 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution. Covers the May 2026 UX Rethink (sidebar companion model).

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest 4.0.18 |
| **Config file** | vitest.config.ts (already configured for jsdom) |
| **Quick run command** | `npx vitest run --reporter=verbose` |
| **Full suite command** | `npx vitest run` |
| **Estimated runtime** | ~15 seconds (31 tests across 5 test files) |

---

## Sampling Rate

- **After every task commit:** Run `npx vitest run <specific-test-file> --reporter=verbose`
- **After every plan wave:** Run `npx vitest run` (full suite)
- **Before `/gsd-verify-work`:** Full suite must be green
- **Max feedback latency:** ~15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 09-04-01 | 04 | 1 | SUGG-06, SUGG-08 | — | Type definitions only; no runtime | static | `npx tsc --noEmit src/lib/types/suggestion.ts` | ✅ | ⬜ pending |
| 09-04-02 | 04 | 1 | SUGG-01, SUGG-02 | T-09-16 | Tier 1: local-only keyword matching, no external data injection | unit | `npx vitest run src/lib/services/paper-keyword-matcher.test.ts` | ✅ Task 2 | ⬜ pending |
| 09-04-03 | 04 | 1 | SUGG-06, SUGG-08 | T-09-19 | 500ms debounce prevents rapid-fire; cleanup() cancels timers | unit | `npx vitest run src/lib/services/section-boundary-detector.test.ts` | ✅ Task 3 | ⬜ pending |
| 09-04-04 | 04 | 1 | SUGG-02, LLM-MULTI-01 | T-09-20a, T-09-20b | LLM re-rank only on-demand; AbortSignal passed; graceful degradation | unit | `npx vitest run src/lib/services/paper-keyword-matcher.test.ts` | ✅ Task 4 | ⬜ pending |
| 09-05-01 | 05 | 1 | SUGG-05 | T-09-21, T-09-22 | Type-checking on item.type; CitationStyle union type validated | unit | `npx vitest run src/lib/services/smart-citation-insert.test.ts` | ✅ Task 1 | ⬜ pending |
| 09-05-02 | 05 | 1 | SUGG-05 | — | Settings store updates; no network boundary | static | `npx tsc --noEmit src/lib/stores/settings.ts` | ✅ | ⬜ pending |
| 09-05-03 | 05 | 1 | LLM-MULTI-02 | T-09-23 | Opt-in guard before recording; local-only storage | static | `npx tsc --noEmit src/lib/stores/telemetry.ts` | ✅ | ⬜ pending |
| 09-05-04 | 05 | 1 | SUGG-05 | T-09-23a, T-09-23b | Reverse-iteration safe; unknown papers preserved; local-only scanning | unit | `npx vitest run src/lib/services/smart-citation-insert.test.ts` | ✅ Task 4 | ⬜ pending |
| 09-06-01 | 06 | 2 | SUGG-03, SUGG-04 | T-09-24, T-09-27 | event.detail.type validated before insertion; content guard >= 10 chars | static + integration | `npx tsc --noEmit && grep assertions` | ✅ | ⬜ pending |
| 09-06-02 | 06 | 2 | SUGG-03, SUGG-04, SUGG-07, UX-04 | T-09-25, T-09-26, T-09-28, T-09-29 | Sidebar read-only; existing papers only; UI-only toggles; toast content from provider errors | integration | `npx vitest run src/lib/components/suggestion/SuggestionsSidebar.test.ts` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `src/lib/services/suggestions.test.ts` — generateIdeas() + generateCompletions() mock provider chain (V4, V5)
- [ ] `src/lib/stores/suggestion-sidebar.test.ts` — Reactive runes store state transitions (V8)
- [ ] `src/lib/stores/settings.test.ts` — citationStyle/sidebarLayout persistence with mock invoke (V9)
- [ ] `src/lib/stores/telemetry.test.ts` — Extend with recordInsertion opt-in guard tests (V10)
- [ ] `src/lib/components/suggestion/SuggestionsSidebar.test.ts` — CustomEvent dispatch + click handlers (V12)

*Existing infrastructure: vitest 4.0.18, jsdom, mock patterns for stores and Tauri invoke.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Sidebar renders at 280px with three collapsible sections | SUGG-03 | Visual rendering requires running browser with theme/context | Open a document, verify sidebar appears to right of editor at 280px width. Three sections (Papers, Ideas, Completions) visible. Click section headers to toggle collapse. |
| Fallback toast appears on provider switch | LLM-MULTI-01 | Requires controlled provider state (make Ollama unavailable) | Configure Ollama as primary. Stop Ollama service. Trigger suggestion generation via "Suggest" button. Verify toast notification appears. |
| Section boundary detection fires on double-newline + pause | SUGG-01 | Timing-based behavior requires human interaction | Type text, press Enter twice, pause 500ms. Verify Ideas and Completions sections populate with loading spinners then results. |
| Click-to-insert places citation at cursor position | SUGG-05 | Cursor position tracking requires running editor | Click a paper suggestion card. Verify formatted citation text appears at cursor position. Change citation style, verify retroactive reformat. |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 30s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
