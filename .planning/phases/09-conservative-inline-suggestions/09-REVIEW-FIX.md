---
phase: 09-Conservative-Inline-Suggestions
fixed_at: 2026-05-21T00:00:00Z
review_path: .planning/phases/09-conservative-inline-suggestions/09-REVIEW.md
iteration: 1
findings_in_scope: 5
fixed: 5
skipped: 0
status: all_fixed
---

# Phase 9: Code Review Fix Report

**Fixed at:** 2026-05-21  
**Source review:** .planning/phases/09-conservative-inline-suggestions/09-REVIEW.md  
**Iteration:** 1

**Summary:**
- Findings in scope: 5 (critical issues)
- Fixed: 5
- Skipped: 0

## Fixed Issues

### CR-01: Null Model Validation

**Files modified:** `src/lib/services/suggestions.ts`  
**Commit:** 9b86a8b  
**Applied fix:** Added validation to throw error if model is unconfigured before passing to `_streamSuggestion()`. Prevents null/undefined model from reaching the provider.

### CR-02: Empty Fallback Chain

**Files modified:** `src/lib/components/document/DocumentEditor.svelte`  
**Commit:** 433e74d  
**Applied fix:** Constructed actual fallback provider chain instead of empty array. If primary is Ollama, fallback chain includes OpenRouter (using stored apiKey). If primary is OpenRouter, fallback chain includes Ollama (using stored host/port).

### CR-03: Settings Migration

**Files modified:** `src/lib/stores/settings.ts`  
**Commit:** bcd1994  
**Applied fix:** Added field validation after merge in `loadSettings()`. All required SuggestionSettings fields are checked and filled from defaults if missing, preventing undefined values at runtime.

### CR-04: API Key Storage

**Files modified:** `src/lib/components/settings/SettingsDialog.svelte`  
**Commit:** 8c536b2  
**Applied fix:** Replaced `localStorage.getItem('openrouter_api_key')` with `$providerState.apiKey`. API key now retrieved from secure provider state instead of localStorage.

### CR-05: Provider Attribution

**Files modified:** `src/lib/services/suggestions.ts`  
**Commit:** 9b86a8b  
**Applied fix:** Fixed hardcoded `provider: 'ollama'` in suggestion result. Now uses actual provider type from settings (`settingsVal.suggestions.llmProvider`) so telemetry and attribution reflect the actual provider used.

---

_Fixed: 2026-05-21_  
_Fixer: Claude (gsd-code-fixer)_  
_Iteration: 1_
