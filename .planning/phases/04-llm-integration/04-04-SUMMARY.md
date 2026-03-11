---
phase: 04-llm-integration
plan: 04
subsystem: context-management
tags: [context-selection, token-counting, tiktoken, context-window, ui]
dependency_graph:
  requires: [04-01, 04-02]
  provides: [contextState store, selectedItems derived, totalTokens derived, tokenizer service, ContextSelection UI]
  affects: [04-05]
tech_stack:
  added: []
  patterns: [Svelte derived stores, Set-based selection state, circular dependency via getter registration]
key_files:
  created:
    - src/lib/stores/context-selection.ts
    - src/lib/services/tokenizer.ts
    - src/lib/components/chat/ContextSelection.svelte
  modified:
    - src/lib/stores/chat.ts (context integration already present from 04-02)
decisions:
  - Mock items use pre-computed token counts (no async during store init)
  - registerContextGetter() called at module load time to wire context into chat automatically
  - getTokenUsageLevel thresholds: 75% = warning (yellow), 90% = danger (red)
  - getModelContextWindow defaults to 32000 for unknown models (Qwen2 range)
  - selectedIds uses Set<string> for O(1) membership checks
metrics:
  duration: 39min (same run)
  completed: 2025-06-07
  tasks: 4
  files_created: 3
  files_modified: 1
---

# Phase 4 Plan 04: Context Selection and Token Budgeting Summary

Context picker with 5 mock research items (papers/notes), real-time token meter with color-coded thresholds, and automatic context injection into LLM system messages.

## What Was Built

- **`src/lib/stores/context-selection.ts`**: 5 mock context items (3 papers: Attention, BERT, GPT-3; 2 notes), `contextState` writable, `selectedItems`/`totalTokens` derived stores, `toggleContextItem`/`clearContext`/`selectAll` + `registerContextGetter()` call on load
- **`src/lib/services/tokenizer.ts`**: `estimateTokens()` (tiktoken, fast), `getAccurateTokenCount()` (provider.tokenCount, exact), `getModelContextWindow()` (per-model limits), `getTokenUsageLevel()` (safe/warning/danger)
- **`src/lib/components/chat/ContextSelection.svelte`**: Expandable panel, checkbox list, token meter bar, warning/danger messages at thresholds

## Context Integration

Selected items are injected as a system message when `streamChat()` is called:
```
You are a research assistant. Reference the following sources:
[PAPER: Attention Is All You Need]
[content...]
Use these sources to provide accurate, cited answers.
```

The getter registration pattern (`registerContextGetter`) breaks the potential circular import between `chat.ts` → `context-selection.ts` → `chat.ts`.

## Mock Data (Phase 4 Placeholder)

All 5 items are mock data with truncated content and pre-computed token estimates. Real integration with Phase 2 paper storage is deferred to a later phase.

## Deviations from Plan

None - plan executed exactly as written.

## Self-Check: PASSED
- `src/lib/stores/context-selection.ts` ✓
- `src/lib/services/tokenizer.ts` ✓
- `src/lib/components/chat/ContextSelection.svelte` ✓
- Context integration in `chat.ts` via `registerContextGetter` ✓
