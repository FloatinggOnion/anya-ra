---
phase: 09-conservative-inline-suggestions
plan: 01
wave: 1
completed_date: 2026-04-12T00:30:00Z
duration_minutes: 45
tasks_completed: 7
requirement_status: SUGG-01,SUGG-02,SUGG-06,SUGG-08,LLM-MULTI-01,LLM-MULTI-02,LLM-MULTI-03,UX-04
---

# Plan 09-01: Core Suggestion Service + Provider Chain + Settings — COMPLETE

**Summary:** Core backend services implemented for suggestion generation with debounce-based triggering, multi-provider fallback chain with error recovery, and workspace-scoped settings persistence. All seven Wave 1 tasks completed with full type safety and Tauri backend support.

## Key Deliverables

✓ **Suggestion Types** - `src/lib/types/suggestion.ts` with Suggestion, SuggestionRequest, Settings, Telemetry interfaces
✓ **SuggestionService** - `src/lib/services/suggestions.ts` with 300ms debounce, auto-cancel, 10s timeout, token budget
✓ **ProviderChain** - `src/lib/services/suggestion-provider-chain.ts` with error classification and fallback logic
✓ **Settings Store** - `src/lib/stores/settings.ts` with auto-persist, provider config, telemetry opt-in
✓ **Telemetry Store** - `src/lib/stores/telemetry.ts` with local-only tracking, opt-in toggle, batch persistence
✓ **OpenRouter Provider** - Already implemented in `src/lib/services/llm/openrouter.ts`
✓ **Tauri Commands** - `src-tauri/src/commands/settings.rs` with 5 commands (save/load settings, save/load/clear telemetry)

## Implementation Details

### Task 1: Type Definitions
- Suggestion interface: id, docId, text, lines[], provider, position, state, acceptedLines
- SuggestionRequest: requestId, abortController, timeoutHandle, docId, startTime
- SuggestionSettings: enabled, displayMode (ghost|block|both), acceptKeybinding, llmProvider, fallbackChain, telemetryOptIn
- TelemetryRecord: docId, provider, type (accept|reject|partial), lineCount, acceptedCount, timestamp
- TelemetryStats: totalSuggestions, accepted, rejected, partial, acceptanceRate, byProvider

### Task 2: SuggestionService
- Public method: `triggerSuggestion(docId, currentContent, cursorPos)` returns Promise<Suggestion | null>
- Debounce: 300ms idle constant verified (per SUGG-01)
- Auto-cancel: Aborts previous request on new keystroke via AbortController
- Timeout: 10s per SUGG-07, calls abort() and returns null
- Token budget: 500 tokens max enforced via js-tiktoken (SUGG-02)
- Context building: Selected papers/notes + document section around cursor
- Telemetry recording: recordAcceptanceTelemetry() and recordRejectionTelemetry() methods

### Task 3: SuggestionProviderChain
- Error classification: connection (recoverable), auth (terminal), timeout (recoverable), unknown
- Fallback strategy: tries each provider in order, skips on recoverable errors, fails fast on auth errors
- Availability check: isAvailable() called before each provider attempt
- Toast notification: onFallback callback fires when fallback occurs
- Generator pattern: async *generateSuggestion() yields chunks for streaming

### Task 4: Settings Store
- Default settings: suggestions enabled, displayMode='ghost', acceptKeybinding='tab', llmProvider='ollama', telemetryOptIn=false
- Auto-persistence: 300ms debounce on store subscription
- Workspace scoped: Settings saved to `.anya/settings.json` in workspace
- Tauri invoke: save_settings and load_settings commands
- Helper functions: loadSettings(), updateSuggestionSettings(), setProviderConfig(), setTelemetryOptIn()

### Task 5: Telemetry Store
- In-memory buffer: TelemetryRecord[] accumulated during session
- Opt-in enforcement: All recording functions check settings.suggestions.telemetryOptIn first
- Auto-persist: Every 10 records written to workspace
- Batch operations: getTelemetryStats() loads persisted + buffer, computes aggregates
- User control: clearTelemetry() deletes history file
- Flush on shutdown: flushTelemetry() called from App.svelte cleanup

### Task 6: OpenRouter Provider
- Already fully implemented with streaming support
- Implements LLMProvider interface: chat(), models(), tokenCount(), isAvailable()
- Handles 401 (auth), 402 (credits), 429 (rate limit) errors with messages
- Uses gpt-3.5-turbo as default model, gpt-4o-mini as fallback

### Task 7: Tauri Backend
- Module: `src-tauri/src/commands/settings.rs` with 5 async commands
- save_settings(workspace_path, settings) → Result<(), String>
- load_settings(workspace_path) → Result<Option<String>, String>
- save_telemetry(workspace_path, records) → Result<(), String>
- load_telemetry(workspace_path) → Result<Option<String>, String>
- clear_telemetry(workspace_path) → Result<(), String>
- All commands create `.anya` directory as needed
- Registered in `src-tauri/src/lib.rs` invoke_handler

## Verification Completed

✓ Type definitions compile without errors
✓ SuggestionService has 300ms debounce constant and 10000ms timeout
✓ ProviderChain has error classification with recoverable: false for auth
✓ Settings has telemetryOptIn: false (opt-in) default
✓ Telemetry checks opt-in before recording
✓ OpenRouter provider implements LLMProvider interface
✓ Cargo check passes (no Rust compilation errors)
✓ All Wave 0 tests still passing (145 tests)

## Requirements Coverage

- ✓ SUGG-01: 300ms debounce constant verified in SuggestionService
- ✓ SUGG-02: 500-token context budget enforced via js-tiktoken
- ✓ SUGG-06: Provider selection via settings.suggestions.llmProvider
- ✓ SUGG-08: Selected items from context-selection store included in context
- ✓ LLM-MULTI-01: Fallback chain implemented with error classification
- ✓ LLM-MULTI-02: Settings persist to `.anya/settings.json` via Tauri
- ✓ LLM-MULTI-03: API key stored via existing keystore pattern (OpenRouter uses it)
- ✓ UX-04: Settings structure ready for Wave 3 UI components

## Integration Points

Services fully decouple from UI:
- SuggestionService can be instantiated with any SuggestionProviderChain
- ProviderChain accepts onFallback callback for toast notifications (upstream)
- Settings store auto-persists on changes (App.svelte calls loadSettings())
- Telemetry records silently if opt-in disabled (no UI coupling)

## Deviations from Plan

None — plan executed exactly as written. All 7 tasks completed:
1. Type definitions created
2. SuggestionService implemented with debounce/abort/timeout
3. SuggestionProviderChain with error classification
4. Settings store with workspace persistence
5. Telemetry store with opt-in logic
6. OpenRouter provider already existed (well-implemented)
7. Tauri commands created and registered

## Next Steps

Wave 2 (Plan 09-02) will integrate SuggestionService into DocumentEditor with CodeMirror decorations for ghost text rendering and Tab/Escape handlers.

---

**Build Status:** ✓ Cargo check passed, no TypeScript errors
**Test Status:** ✓ All Wave 0 tests still passing (145/145)
**Ready for Wave 2:** YES
