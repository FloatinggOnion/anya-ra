# Phase 9 Discussion Log

**Date:** 2026-04-11  
**Facilitator:** Claude  
**Participant:** User (paul)

---

## Overview

User selected 4 of 8 gray areas for focused discussion:
1. Suggestion Trigger Behavior — Cancellation Handling
2. Suggestion Display — Positioning & Multi-line Handling
3. (skipped) Suggestion Content Filtering
4. (skipped) Token Budget Awareness
5. (skipped) Validation Integration
6. Provider Fallback Chain — Default Priority & Configuration
7. (skipped) Analytics Dashboard
8. Acceptance Rate Tracking — Telemetry Approach

Each area was explored with focused questions to lock implementation decisions.

---

## Area 1: Suggestion Trigger Behavior

**Question 1.1: Cancellation Model?**
- Option A: Auto-cancel ← **SELECTED**
- Option B: Queue
- Option C: Ignore new
- Option D: User choice

**Question 1.2: Debounce before new request?**
- **YES** — 300ms idle (matching save debounce pattern)

**Question 1.3: Timeout for in-flight requests?**
- **YES** — **10 seconds** (abandoned if longer)

**Rationale:** Industry standard (Copilot, Cursor); responsive feedback; prevents hammering; prevents UI hang.

---

## Area 2: Suggestion Display

**Question 2.1: Multi-line acceptance?**
- **Line-by-line partial** (user can accept 1st line, skip 2nd, accept 3rd)
- Not all-or-nothing

**Question 2.2: Insertion behavior?**
- **Insert and let user see it flowing through text**
- (Not: hover preview or modal)

**Question 2.3: Visual styling?**
- **Ghost text + highlighted block, both configurable**
- User can choose preference in Settings

**Question 2.4: Keybinding for accept?**
- **Tab (default) but configurable**
- User can map to Ctrl+Enter or other binding in Settings

**Scope Addition:** Create Settings page to house suggestion display preferences + future UX toggles. User approved gradual infill of settings as features are added.

---

## Area 6: Provider Fallback Chain

**Question 6.1: Ranked list by default?**
- **NO** — User selects from the start; no hardcoded ranking
- Both OllamaProvider and OpenRouterProvider equally valid

**Question 6.2: Silent or visible fallback?**
- **Visible** — Notify user when fallback occurs (toast: "OpenRouter unavailable, using Ollama")

**Question 6.3: Fallback chain configuration?**
- **YES — in Settings** — User defines priority order (e.g., Primary: OpenRouter, Fallback: Ollama)

**Question 6.4: Retry behavior?**
- **Retry on next suggestion** — Don't abandon primary provider for the session; next request tries it again

**Rationale:** User control + graceful degradation; transparent; maintains session continuity.

---

## Area 8: Acceptance Rate Tracking

**Question 8.1: What to track?**
- **All of it**: Accept count, Reject count, Partial acceptance (line-by-line), Provider used

**Question 8.2: Storage location?**
- **Local only** — JSON file in workspace `/.anya/telemetry.json`

**Question 8.3: Opt-in or opt-out?**
- **Opt-in** — Off by default; user must explicitly enable in Settings

**Question 8.4: Privacy boundary?**
- **Strictly local** — No network transmission, no cloud sync, no external analytics

**Rationale:** Privacy-first; transparent; useful for product dev without compromise.

---

## Deferred Areas

Areas 3, 4, 5, 7 deferred:
- Not enough urgency to constrain Phase 9 scope
- Will revisit when implementation reveals dependencies or later phases need them

---

## User Preferences Summary

- **Philosophy**: Conservative (user-controlled), transparent (user-visible), local-first (no telemetry leakage)
- **UX principle**: Configurable > opinionated (let user set preferences, don't force behaviors)
- **Scope**: Settings page scaffolding now, fill as needed

---

**Decision Lock Time:** ~15 min (4 focused areas, 2-4 questions each)  
**Confidence Level:** High (clear, specific answers; no hedging)  
**Next Phase:** Planning (Jan. 2026-ready; architecture + task breakdown)
