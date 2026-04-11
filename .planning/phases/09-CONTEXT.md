# Phase 9 Context — Conservative Inline Suggestions

**Phase Goal:** Implement real-time inline LLM suggestions in the document editor with conservative (user-controllable) presentation, multi-provider support, and local-only telemetry.

**Locked Decisions** (user-approved, not to be re-discussed):

## 1. Suggestion Trigger Behavior — Auto-Cancel Model

**Decision:** Use auto-cancel with debounce and timeout.

- **Cancellation**: When user edits document while suggestion is in-flight, immediately abort the request and queue a new one based on new content
- **Debounce**: 300ms idle (no further edits) before triggering the new suggestion request
- **Timeout**: Abandon any suggestion request that exceeds 10 seconds
- **Rationale**: Keeps suggestions always current and responsive; matches industry standard (GitHub Copilot, Cursor); 300ms debounce prevents thrashing; 10s timeout prevents UI hang

**Implementation Guidance:**
- Use `AbortController` for request cancellation
- Reuse debounce timer logic (same pattern as document save)
- Track in-flight request ID to prevent race conditions
- Toast notification if request times out ("Suggestion timed out")

**Canonical References:**
- `src/lib/stores/documents.ts:76-102` — debounce pattern for save (reuse this structure)
- `src/lib/types/llm.ts` — LLMProvider interface has chat() method signature

---

## 2. Suggestion Display — Inline with Configurable UX

**Decision:** Display suggestions as inline decorations with line-by-line partial acceptance.

- **Insertion**: Insert suggestion directly into editor; user sees it flow through their text
- **Multi-line acceptance**: Line-by-line granularity — user can accept 1st line, skip 2nd, accept 3rd (not all-or-nothing)
- **Visual styling**: Ghost text (faint/grayed) + optional highlighted block; both configurable by user
- **Keybinding**: Tab to accept (default); configurable in Settings
- **Settings page**: Create new `/settings` route or `SuggestionsSettings` component with toggles for:
  - Styling preference (ghost text, block highlight, both)
  - Accept keybinding (Tab, Ctrl+Enter, etc.)
  - Enable/disable suggestions globally
  - Opt-in to telemetry
- **Rationale**: Line-by-line gives user fine control; ghost text is non-intrusive; configurable UX reduces friction for different preferences

**Implementation Guidance:**
- Use CodeMirror 6 decorations (same pattern as DocumentEditor validation UI)
- Partial acceptance requires tracking which lines of multi-line suggestion user accepted
- Settings stored in workspace `.anya/settings.json` or Svelte store with persistence
- Keybinding configurable via keyboard event listener (not hardcoded)

**Canonical References:**
- `src/lib/components/document/DocumentEditor.svelte` — CodeMirror integration and decoration pattern
- Phase 8 CONTEXT.md — citation validation decoration pattern (reuse similar approach)

---

## 3. Multi-Provider Support with Fallback & Visibility

**Decision:** User selects provider; auto-fallback if selected fails; chain configurable in Settings.

- **Provider selection**: User chooses primary provider upfront (no hardcoded ranking; both providers equally valid)
- **Fallback behavior**: If selected provider fails (connection error, auth error, timeout), automatically try other available providers in user-defined priority order
- **User notification**: Toast or banner when fallback occurs (e.g., "OpenRouter unavailable, using Ollama")
- **Fallback chain configuration**: Settings page allows user to define priority order of providers (e.g., "Primary: OpenRouter, Fallback: Ollama")
- **Retry behavior**: On next suggestion request, retry the primary provider (don't abandon it for the session)
- **Error visibility**: If all providers fail, show user an error toast with actionable message (e.g., "Check API key" or "Check Ollama connection")
- **Rationale**: User control + graceful degradation; transparent fallback prevents silent failures; retry on next request maintains session continuity

**Implementation Guidance:**
- Extend `src/lib/stores/llm-provider.ts` with fallback chain logic
- Update provider initialization to load user-defined fallback order from Settings
- Catch provider errors in suggestion request handler; attempt fallback chain
- Toast notifications for fallback and all-providers-failed states
- Test matrix: OpenRouter available, Ollama unavailable; vice versa; both unavailable

**Canonical References:**
- `src/lib/stores/llm-provider.ts` — ProviderState, switchProvider(), setApiKey()
- `src/lib/types/llm.ts:13-20` — LLMProvider interface with isAvailable() method
- `src/lib/services/ollama.ts` and `src/lib/services/openrouter.ts` — provider implementations

---

## 4. Acceptance Rate Tracking — Local-Only Opt-In Telemetry

**Decision:** Track suggestion acceptance locally, off by default, user opts in.

- **Metrics tracked**:
  - Accept: Count of suggestions fully accepted
  - Reject: Count of suggestions ignored/rejected
  - Partial: Count of partial acceptances (per line, or per suggestion if multi-line)
  - Provider: Track which provider was used for each suggestion
- **Storage**: JSON file in workspace `/.anya/telemetry.json` (or equivalent local store)
- **Opt-in**: Telemetry disabled by default; user must explicitly enable in Settings → "Help improve Anya" toggle
- **Privacy**: Strictly local — no network transmission, no cloud sync, no external analytics
- **Retention**: User can clear telemetry history from Settings
- **Rationale**: Local-only respects privacy; opt-in is transparent and non-creepy; helps development without privacy cost

**Implementation Guidance:**
- Create `src/lib/stores/telemetry.ts` with:
  - `recordAcceptance(docId, lineCount, provider)` — full or partial acceptance
  - `recordRejection(docId, provider)` — user rejected suggestion
  - `getTelemetryStats()` — aggregate counts by provider
  - `clearTelemetry()` — user-initiated cleanup
- Store in workspace under `.anya/telemetry.json` (reuse workspace store pattern)
- Settings toggle to enable/disable (does not clear history, just stops recording)
- Display summary stats in Settings (optional): "Suggested: 42 times | Accepted: 28 (66%)"

**Canonical References:**
- `src/lib/stores/workspace.ts` — workspace path pattern; reuse for telemetry file location
- `src/lib/stores/documents.ts` — save pattern to persist telemetry

---

## Deferred Gray Areas (Not Discussed — Revisit Later)

- **Area 3**: Suggestion content filtering / instruction tuning
- **Area 4**: Token budget awareness in suggestions (avoid exceeding context window)
- **Area 5**: Real-time validation integration (how suggestions interact with existing citation validation)
- **Area 7**: Analytics dashboard (future: visualize acceptance rates over time)

These will be revisited in later phases or when implementation reveals dependencies.

---

## Settings Page Scope (Phased)

**Phase 9 should create the Settings structure** with toggles for:
1. Suggestion display (styling, keybinding) — locked in Area 2
2. Provider fallback order — locked in Area 3
3. Telemetry opt-in — locked in Area 4

**Future phases can add**:
- Theme toggle (already exists elsewhere, may consolidate)
- More suggestion tuning options (Areas 3, 4)
- Telemetry dashboard / stats view

---

## Next Steps (for Planning Phase)

1. **Confirm CodeMirror decoration strategy** for line-by-line partial acceptance (may require custom widget)
2. **Design Settings page layout** (settings.json schema, Svelte component)
3. **Outline provider fallback chain logic** (error handling, retry timing)
4. **Implement telemetry store** (local JSON persistence, opt-in toggle)
5. **Integration points**: 
   - Hook suggestion trigger into DocumentEditor keystroke events
   - Connect Settings toggles to suggestion display behavior
   - Wire up provider selection/fallback in LLM store

---

**Document Version:** 1.0  
**Last Updated:** 2026-04-11  
**Status:** Ready for Planning Phase
