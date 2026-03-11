---
phase: 04-llm-integration
plan: 01
subsystem: llm-core
tags: [llm, types, provider-interface, ollama, streaming]
dependency_graph:
  requires: []
  provides: [LLMProvider interface, OllamaProvider, Message/Model/ChatOptions types, ChatMessage/ChatState/DraftSection types]
  affects: [04-02, 04-03, 04-04, 04-05]
tech_stack:
  added: [js-tiktoken@1.0.21]
  patterns: [async-generator streaming, fetch + ReadableStream, JSON-per-line parsing]
key_files:
  created:
    - src/lib/types/llm.ts
    - src/lib/types/chat.ts
    - src/lib/services/llm/ollama.ts
    - src/lib/services/llm/providers.ts
    - src/lib/services/llm/openai.ts
  modified: []
decisions:
  - Used relative imports (../types/llm) not $lib path alias (not configured in project)
  - encodingForModel (camelCase) not encoding_for_model - js-tiktoken v1 API
  - createProvider() throws for openai; createProviderAsync() handles dynamic import correctly
  - Tiktoken class has no .free() method in v1.0.21 - encode() returns number[] directly
metrics:
  duration: 39min
  completed: 2025-06-07
  tasks: 3
  files_created: 5
---

# Phase 4 Plan 01: LLM Type Definitions and Provider Interface Summary

LLMProvider interface with OllamaProvider streaming via fetch + ReadableStream JSON-per-line parsing, OpenAIProvider with SSE, and all chat/draft types.

## What Was Built

- **`src/lib/types/llm.ts`**: Core `LLMProvider` interface (chat/models/tokenCount/isAvailable), `Message`, `Model`, `ChatOptions` types
- **`src/lib/types/chat.ts`**: `ChatMessage`, `ChatState`, `DraftSection`, `ChatHistory` types + `parseDraftSections()` helper
- **`src/lib/services/llm/ollama.ts`**: `OllamaProvider` with streaming via `fetch` + `ReadableStream`, partial-line buffer management, `pullModel()` for auto-pull
- **`src/lib/services/llm/openai.ts`**: `OpenAIProvider` with SSE streaming, tiktoken tokenCount, hardcoded model list
- **`src/lib/services/llm/providers.ts`**: `createProvider()` factory + `createProviderAsync()` for dynamic imports

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] js-tiktoken uses `encodingForModel` not `encoding_for_model`**
- **Found during:** Task 2/3
- **Issue:** Plan referenced `encoding_for_model` (Python/snake_case API) but js-tiktoken v1 exports camelCase
- **Fix:** Changed to `encodingForModel` throughout
- **Files modified:** `src/lib/services/llm/openai.ts`, `src/lib/services/tokenizer.ts`

**2. [Rule 1 - Bug] Tiktoken has no `.free()` method**
- **Found during:** Task 3
- **Issue:** Plan code called `enc.free()` but js-tiktoken v1 `Tiktoken` class has no such method
- **Fix:** Removed `.free()` call; `encode()` returns `number[]` directly
- **Files modified:** `src/lib/services/llm/openai.ts`

**3. [Rule 2 - Missing] OpenAI provider created in Plan 01 instead of Plan 03**
- **Reason:** `providers.ts` needed `./openai` to exist for TypeScript to resolve dynamic import types
- **Fix:** Created full `OpenAIProvider` in Plan 01 as part of the factory setup
- **Impact:** Plan 03 just updates providers.ts (no duplication)

## Self-Check: PASSED
- `src/lib/types/llm.ts` ✓
- `src/lib/types/chat.ts` ✓  
- `src/lib/services/llm/ollama.ts` ✓
- `src/lib/services/llm/providers.ts` ✓
- `src/lib/services/llm/openai.ts` ✓
