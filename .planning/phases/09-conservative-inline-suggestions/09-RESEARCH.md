# Phase 9: Conservative Inline Suggestions - Research

**Researched:** 2026-04-11  
**Domain:** Real-time LLM suggestion UI integration, multi-provider fallback, CodeMirror 6 decorations  
**Confidence:** HIGH for patterns, MEDIUM for CodeMirror partial acceptance strategy  

## Summary

Phase 9 implements real-time inline writing suggestions with conservative, user-controlled presentation. The phase builds on Phase 8's document editor (CodeMirror 6) and existing multi-provider LLM abstraction (Ollama + OpenRouter). Key technical challenges: (1) CodeMirror 6 decoration + widget pattern for line-by-line partial acceptance requires careful state tracking and transaction design, (2) provider fallback chain logic must distinguish recoverable errors (timeouts, connection) from terminal errors (invalid API key), (3) request lifecycle (debounce + auto-cancel + timeout) reuses existing patterns from documents auto-save but needs AbortController for HTTP cancellation.

**Primary recommendation:** Implement suggestions as a service layer (SuggestionService) wrapping the LLM provider abstraction. Use CodeMirror state field + effect pattern for ghost text rendering. Track acceptance state separately (not in document content) to preserve undo/redo atomicity. Store settings in workspace `.anya/settings.json` with Tauri invoke for persistence.

---

## User Constraints (from CONTEXT.md)

### Locked Decisions

1. **Trigger Behavior — Auto-Cancel Model:** 300ms debounce idle, 10s timeout, AbortController for cancellation. Reuse save debounce pattern.

2. **Display — Inline Ghost Text + Block:** Line-by-line partial acceptance granularity. Settings page with styling preference (ghost text, block highlight, both), configurable Tab keybinding. Prevent undo/redo breakage.

3. **Multi-Provider Fallback:** User selects primary provider; auto-fallback if primary fails. Toast notification when fallback occurs. Fallback chain configurable in Settings. Retry primary on next request.

4. **Telemetry — Local-Only Opt-In:** Track accept/reject/partial rates per provider in JSON file. Off by default; user opts in via Settings toggle. No network transmission.

### Claude's Discretion (Not Locked)

- Suggestion request timeout handling (10s is locked; handling strategy is flexible)
- Partial acceptance granularity (line-by-line is locked; exact state tracking pattern is flexible)
- Settings UI layout and styling
- Telemetry display/summary format
- Fallback retry delay timing

### Deferred Ideas (Out of Scope)

- Suggestion content filtering / instruction tuning
- Token budget awareness (mention in research but don't implement)
- Real-time validation integration (how suggestions interact with citation validation)
- Analytics dashboard

---

## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| SUGG-01 | When user idle 500ms while editing document, generate ONE suggestion | Debounce + keystroke detection pattern |
| SUGG-02 | Suggestions context-aware: use selected papers + document section | context-selection store integration |
| SUGG-03 | Suggestion appears as ghost text (grayed, inline) | CodeMirror decoration + widget pattern |
| SUGG-04 | User can accept (Tab), reject (Esc), or edit before accepting | Keystroke handler + partial acceptance state |
| SUGG-05 | Accepted → committed to doc; rejected → discarded | Transaction-based commit to preserve undo/redo |
| SUGG-06 | Generation via Ollama/OpenAI (existing LLM integration) | Extends existing LLMProvider interface |
| SUGG-07 | Loading indicator if >1s to generate | Toast service (already used in codebase) |
| SUGG-08 | User can select papers/notes as context via chat pane | context-selection store API |
| UX-04 | Chat context pane shows "Selected for suggestions" | Derived store over selectedItems |
| LLM-MULTI-01 | LLM provider abstraction supports Ollama, OpenAI, OpenRouter | Existing interface; extend with error classification |
| LLM-MULTI-02 | User configures provider via settings with fallback chain | Settings page + fallback service wrapper |
| LLM-MULTI-03 | OpenRouter API key securely stored (tauri-plugin-store pattern) | Existing llm-provider.ts setApiKey pattern |

---

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| svelte-codemirror-editor | 2.1.0 | CodeMirror 6 integration | Same editor as Phase 8; existing CSS patterns |
| @codemirror/view | 6.40.0 | Decorations, state fields, effects | Official CodeMirror decoration API |
| @codemirror/state | 6.6.0 | Transaction, StateField, StateEffect | Official state management for CM6 |
| js-tiktoken | 1.0.21 | Token counting | Already used by OpenRouterProvider |
| Svelte 5 stores (writable/derived) | 5.0.0 | Settings, telemetry, provider state | Existing pattern in codebase |
| Tauri @tauri-apps/api/core | 2.x | invoke() for Rust backend (settings I/O) | Existing pattern for persistence |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| @tauri-apps/plugin-store | 2.4.2 | Optional: encrypted key-value store for API keys | For sensitive data (currently using invoke/Rust); consider for Phase 9+ if needed |
| fetch API (native) | — | HTTP requests (streaming) | Already used by OllamaProvider + OpenRouterProvider |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| CodeMirror state field for ghost text | Plain DIV overlay | Overlay is easier but doesn't integrate with undo/redo; state field requires transaction discipline |
| Svelte writable store for settings | JSON file directly (no reactivity) | JSON is simpler but requires manual subscription; store enables reactive UI updates |
| Local telemetry file | SQLite in workspace | SQLite is more queryable but adds Rust dependencies; JSON is sufficient for MVP with simple append-only structure |

**Installation:**
```bash
# Already in package.json; no new deps needed for core functionality
npm view svelte-codemirror-editor version      # 2.1.0
npm view @codemirror/view version              # 6.40.0+
npm view js-tiktoken version                   # 1.0.21+
```

**Verified versions:**
- svelte-codemirror-editor: 2.1.0 (current, per package.json)
- @codemirror/view: 6.40.0+ (specified in package.json)
- js-tiktoken: 1.0.21+ (specified in package.json)
- Tauri store plugin: 2.4.2 (per package.json)

---

## Architecture Patterns

### Pattern 1: Suggestion Request Lifecycle (Debounce + Cancel + Timeout)

**What:** Auto-cancel in-flight suggestion requests when user keystroke detected; debounce 300ms idle before triggering; 10s timeout abandons request and shows toast.

**When to use:** Every keystroke in DocumentEditor triggers this flow.

**Pattern implementation:**

```typescript
// src/lib/stores/suggestions.ts
interface SuggestionRequest {
  requestId: string
  abortController: AbortController
  timeoutHandle: ReturnType<typeof setTimeout>
}

let pendingRequest: SuggestionRequest | null = null

export async function triggerSuggestion(docId: string, content: string) {
  // Cancel previous request if in-flight
  if (pendingRequest) {
    pendingRequest.abortController.abort()
    clearTimeout(pendingRequest.timeoutHandle)
  }

  // Debounce keystroke: reset 300ms timer on each keystroke
  if (debounceTimer) clearTimeout(debounceTimer)

  debounceTimer = setTimeout(async () => {
    const requestId = crypto.randomUUID()
    const abortController = new AbortController()

    // 10s timeout
    const timeoutHandle = setTimeout(() => {
      abortController.abort()
      showToast('Suggestion timed out', 'warning')
    }, 10000)

    pendingRequest = { requestId, abortController, timeoutHandle }

    try {
      const suggestion = await generateSuggestion(content, {
        signal: abortController.signal
      })
      // Handle suggestion...
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') {
        // Request was cancelled (either by user or timeout)
        return
      }
      // Handle real errors...
    }
  }, 300)
}
```

**Why this pattern:**
- Reuses existing save debounce structure from documents.ts (proven pattern)
- AbortController is standard for fetch cancellation
- Prevents suggestion thrashing on rapid typing
- Timeout prevents indefinite UI hang

**Key insight:** AbortController.signal must be passed to fetch() to enable actual HTTP cancellation (not just JS-side cleanup). Both OllamaProvider and OpenRouterProvider already support signal via fetch options.

---

### Pattern 2: CodeMirror Ghost Text Decoration + State Field

**What:** Display suggestion as faint gray text at cursor using CodeMirror StateField + StateEffect + Decoration.

**When to use:** When suggestion is generated and accepted/rejected state is tracked.

**Implementation:**

```typescript
// src/lib/components/editor/SuggestionDecorations.ts
import { StateField, StateEffect } from '@codemirror/state'
import { Decoration, EditorView } from '@codemirror/view'
import type { Text } from '@codemirror/state'

// Effect to update suggestion text
export const setSuggestion = StateEffect.define<{
  text: string
  line: number
  col: number
  accepted: Set<number>  // Set of accepted line numbers
}>()

const ghostTextMark = Decoration.replace({
  widget: new class extends WidgetType {
    constructor(readonly text: string) {}
    toDOM() {
      const span = document.createElement('span')
      span.className = 'suggestion-ghost-text'
      span.textContent = this.text
      return span
    }
  }(suggestion.text)
})

export const suggestionField = StateField.define({
  create() {
    return {
      suggestion: null as Suggestion | null,
      acceptedLines: new Set<number>()
    }
  },

  update(value, tr) {
    let newValue = { ...value }
    for (const effect of tr.effects) {
      if (effect.is(setSuggestion)) {
        newValue.suggestion = effect.value
      }
    }
    return newValue
  },

  provide: f => EditorView.decorations.compute([f], (state) => {
    const { suggestion, acceptedLines } = state.field(f)
    if (!suggestion) return Decoration.none

    const decorations = []
    const lines = suggestion.text.split('\n')
    
    // Create decoration only for non-accepted lines
    for (let i = 0; i < lines.length; i++) {
      if (!acceptedLines.has(i)) {
        const pos = cursorPos + lineOffset[i]
        decorations.push(ghostTextMark.range(pos, pos))
      }
    }

    return Decoration.set(decorations)
  })
})
```

**Why this pattern:**
- StateField integrates with CodeMirror's transaction system (preserves undo/redo)
- Decoration.replace() creates "widget" (non-editable overlay text)
- Ghost text appears inline without affecting document content
- acceptedLines Set tracks which lines user accepted (for partial acceptance)

**CSS styling:**
```css
:global(.suggestion-ghost-text) {
  color: var(--color-text-secondary);
  opacity: 0.5;
  font-style: italic;
  text-decoration: underline dashed var(--color-suggestion);
}
```

---

### Pattern 3: Line-by-Line Partial Acceptance State Machine

**What:** User can accept entire suggestion, or line-by-line. Track which lines accepted in separate state (not in document). On commit, insert only accepted lines.

**When to use:** When suggestion is rendered and user presses Tab/Escape.

**State machine:**

```typescript
type SuggestionState = 'pending' | 'accepted' | 'rejected' | 'partial'

interface SuggestionWidget {
  text: string  // Full suggestion
  lines: string[]
  position: { line: number; col: number }
  state: SuggestionState
  acceptedLines: Set<number>  // Which line indices user accepted
}

// Keystroke handlers in NotesEditor
function handleKeydown(event: KeyboardEvent) {
  if (event.key === 'Tab' && suggestionWidget) {
    event.preventDefault()
    
    if (event.shiftKey) {
      // Shift+Tab: toggle current line acceptance
      const currentLine = getCursorLine()
      if (suggestionWidget.acceptedLines.has(currentLine)) {
        suggestionWidget.acceptedLines.delete(currentLine)
      } else {
        suggestionWidget.acceptedLines.add(currentLine)
      }
      updateDecoration(suggestionWidget)
    } else {
      // Tab: accept all
      for (let i = 0; i < suggestionWidget.lines.length; i++) {
        suggestionWidget.acceptedLines.add(i)
      }
      commitSuggestion(suggestionWidget)
    }
  } else if (event.key === 'Escape' && suggestionWidget) {
    event.preventDefault()
    clearSuggestion()
  }
}

function commitSuggestion(widget: SuggestionWidget) {
  const accepted = widget.lines
    .filter((_, i) => widget.acceptedLines.has(i))
    .join('\n')

  // Insert via transaction (preserves undo/redo)
  const tr = editor.state.update({
    changes: {
      from: widget.position.col,
      to: widget.position.col,
      insert: accepted
    }
  })

  // Record telemetry
  recordSuggestionAcceptance(widget.lines.length, widget.acceptedLines.size)
}
```

**Why this pattern:**
- Transactions guarantee undo/redo includes suggestion acceptance atomically
- acceptedLines Set is lightweight state tracking
- Clear separation between suggestion display (decoration) and document content

---

### Pattern 4: Provider Fallback Chain Service

**What:** Wrapper around LLM provider that catches errors, classifies them (recoverable vs. terminal), and attempts fallback chain.

**When to use:** Every suggestion request routes through this wrapper.

**Implementation:**

```typescript
// src/lib/services/suggestion-provider.ts
import type { LLMProvider } from '../types/llm'

interface ProviderError {
  code: 'connection' | 'auth' | 'timeout' | 'unknown'
  message: string
  recoverable: boolean
}

function classifyError(err: unknown): ProviderError {
  if (err instanceof TypeError && err.message.includes('fetch')) {
    return { code: 'connection', message: 'Connection failed', recoverable: true }
  }
  if (err instanceof Error) {
    if (err.message.includes('Invalid') && err.message.includes('API key')) {
      return { code: 'auth', message: 'Invalid API key', recoverable: false }
    }
    if (err.message.includes('timeout')) {
      return { code: 'timeout', message: 'Request timed out', recoverable: true }
    }
  }
  return { code: 'unknown', message: String(err), recoverable: true }
}

export class SuggestionProviderChain {
  constructor(
    private primaryProvider: LLMProvider,
    private fallbackChain: LLMProvider[],
    private onFallback: (message: string) => void  // Toast callback
  ) {}

  async *generateSuggestion(
    messages: Message[],
    options: ChatOptions,
    signal: AbortSignal
  ): AsyncIterable<string> {
    const providers = [this.primaryProvider, ...this.fallbackChain]
    
    for (let i = 0; i < providers.length; i++) {
      const provider = providers[i]
      const isBackup = i > 0

      try {
        // Check provider availability first
        const available = await provider.isAvailable()
        if (!available) {
          if (isBackup) {
            this.onFallback(`Provider ${i} unavailable, trying next...`)
          }
          continue
        }

        // Stream response
        yield* provider.chat(messages, options)
        return  // Success!
      } catch (err) {
        const error = classifyError(err)

        if (!error.recoverable) {
          // Terminal error — don't try fallback
          throw err
        }

        if (isBackup) {
          this.onFallback(`Provider ${i} failed: ${error.message}`)
        }

        // Try next provider
        if (i === providers.length - 1) {
          // All providers failed
          throw new Error(`All suggestion providers failed: ${error.message}`)
        }
      }
    }

    throw new Error('No providers available')
  }
}
```

**Why this pattern:**
- Classifies errors to avoid fallback on permanent failures (auth errors)
- Notifies user via callback (toast) when fallback occurs
- Retries primary provider on next request (doesn't permanently switch)
- Preserves existing LLMProvider interface (providers don't know about fallback)

---

### Pattern 5: Settings Storage (Workspace-Scoped JSON)

**What:** Settings stored in `.anya/settings.json` (alongside other workspace files). Writable Svelte store with debounced persistence via Tauri invoke.

**When to use:** App-wide for suggestion preferences, provider config, telemetry opt-in.

**Implementation:**

```typescript
// src/lib/stores/settings.ts
import { writable } from 'svelte/store'
import { invoke } from '@tauri-apps/api/core'
import { workspace } from './workspace'

export interface SuggestionSettings {
  enabled: boolean
  displayMode: 'ghost' | 'block' | 'both'  // Ghost text styling
  acceptKeybinding: 'tab' | 'ctrl-enter' | 'cmd-enter'
  llmProvider: 'ollama' | 'openrouter'
  fallbackChain: ('ollama' | 'openrouter')[]  // Provider priority order
  telemetryOptIn: boolean
}

export interface Settings {
  suggestions: SuggestionSettings
  // Future: theme, other UI preferences
}

const defaultSettings: Settings = {
  suggestions: {
    enabled: true,
    displayMode: 'ghost',
    acceptKeybinding: 'tab',
    llmProvider: 'ollama',
    fallbackChain: ['ollama', 'openrouter'],
    telemetryOptIn: false,
  },
}

export const settings = writable<Settings>(defaultSettings)

let pendingSave: ReturnType<typeof setTimeout> | null = null

// Auto-save on changes (debounced 300ms)
settings.subscribe(async (value) => {
  if (pendingSave) clearTimeout(pendingSave)

  pendingSave = setTimeout(async () => {
    const ws = get(workspace)
    if (!ws) return

    try {
      await invoke('save_settings', {
        workspacePath: ws.path,
        settings: JSON.stringify(value, null, 2)
      })
    } catch (err) {
      console.error('[settings] Save failed:', err)
    }
  }, 300)
})

// Load settings on startup (called from App.svelte)
export async function loadSettings(workspacePath: string) {
  try {
    const content = await invoke<string | null>('load_settings', {
      workspacePath
    })
    if (content) {
      const loaded = JSON.parse(content) as Settings
      settings.set(loaded)
    }
  } catch (err) {
    console.error('[settings] Load failed:', err)
    // Use defaults
  }
}
```

**Why this pattern:**
- Workspace-scoped: each workspace has its own settings (independent from others)
- JSON format: human-readable, easy to backup/migrate
- Debounced persistence: avoids thrashing disk I/O
- Reactive Svelte store: UI components automatically update when settings change

**Schema for `.anya/settings.json`:**
```json
{
  "suggestions": {
    "enabled": true,
    "displayMode": "ghost",
    "acceptKeybinding": "tab",
    "llmProvider": "ollama",
    "fallbackChain": ["ollama", "openrouter"],
    "telemetryOptIn": false
  }
}
```

---

### Pattern 6: Telemetry (Local-Only JSON Append)

**What:** Track acceptance/rejection metrics in `.anya/telemetry.json`. Opt-in toggle in Settings. Schema: array of acceptance events with timestamp, provider, line count, accepted count.

**When to use:** When user accepts/rejects suggestion (if telemetry opt-in is true).

**Implementation:**

```typescript
// src/lib/stores/telemetry.ts
import { writable, get } from 'svelte/store'
import { invoke } from '@tauri-apps/api/core'
import { settings } from './settings'
import { workspace } from './workspace'

export interface TelemetryEvent {
  timestamp: string  // ISO 8601
  type: 'accept' | 'reject' | 'partial'
  provider: 'ollama' | 'openrouter'
  totalLines: number
  acceptedLines: number  // Partial acceptance count; equals totalLines for full accept
}

export interface TelemetryData {
  version: 1
  events: TelemetryEvent[]
}

// In-memory cache (append-only)
export const telemetryData = writable<TelemetryEvent[]>([])

// Load on startup
export async function initTelemetry(workspacePath: string) {
  try {
    const content = await invoke<string | null>('load_telemetry', {
      workspacePath
    })
    if (content) {
      const data = JSON.parse(content) as TelemetryData
      telemetryData.set(data.events)
    }
  } catch (err) {
    console.error('[telemetry] Load failed:', err)
  }
}

// Record acceptance (called when user commits suggestion)
export async function recordSuggestionEvent(
  type: 'accept' | 'reject' | 'partial',
  provider: 'ollama' | 'openrouter',
  totalLines: number,
  acceptedLines: number
) {
  // Check opt-in
  const sett = get(settings)
  if (!sett.suggestions.telemetryOptIn) return

  const event: TelemetryEvent = {
    timestamp: new Date().toISOString(),
    type,
    provider,
    totalLines,
    acceptedLines
  }

  // Update in-memory
  telemetryData.update(events => [...events, event])

  // Persist to disk
  const ws = get(workspace)
  if (!ws) return

  try {
    const data: TelemetryData = {
      version: 1,
      events: get(telemetryData)
    }
    await invoke('save_telemetry', {
      workspacePath: ws.path,
      telemetry: JSON.stringify(data, null, 2)
    })
  } catch (err) {
    console.error('[telemetry] Save failed:', err)
  }
}

// Get summary stats
export function getTelemetrySummary(): {
  totalSuggestions: number
  acceptRate: number
  partialRate: number
  byProvider: Record<string, { count: number; acceptRate: number }>
} {
  const events = get(telemetryData)
  if (events.length === 0) {
    return { totalSuggestions: 0, acceptRate: 0, partialRate: 0, byProvider: {} }
  }

  const byType = events.reduce((acc, e) => {
    acc[e.type] = (acc[e.type] || 0) + 1
    return acc
  }, {} as Record<string, number>)

  const byProvider = events.reduce((acc, e) => {
    if (!acc[e.provider]) {
      acc[e.provider] = { count: 0, accepted: 0 }
    }
    acc[e.provider].count++
    if (e.type === 'accept' || e.type === 'partial') {
      acc[e.provider].accepted++
    }
    return acc
  }, {} as Record<string, { count: number; accepted: number }>)

  return {
    totalSuggestions: events.length,
    acceptRate: (byType.accept ?? 0) / events.length,
    partialRate: (byType.partial ?? 0) / events.length,
    byProvider: Object.fromEntries(
      Object.entries(byProvider).map(([k, v]) => [
        k,
        { count: v.count, acceptRate: v.accepted / v.count }
      ])
    )
  }
}

// Clear telemetry (called from Settings UI)
export async function clearTelemetry() {
  telemetryData.set([])

  const ws = get(workspace)
  if (!ws) return

  try {
    const data: TelemetryData = { version: 1, events: [] }
    await invoke('save_telemetry', {
      workspacePath: ws.path,
      telemetry: JSON.stringify(data, null, 2)
    })
  } catch (err) {
    console.error('[telemetry] Clear failed:', err)
  }
}
```

**Why this pattern:**
- Append-only: no risk of data corruption (never update, only append)
- Opt-in toggle: privacy-respecting
- Per-workspace storage: data stays local
- Summary stats: dashboard-ready format for future analytics

**Schema for `.anya/telemetry.json`:**
```json
{
  "version": 1,
  "events": [
    {
      "timestamp": "2026-04-11T10:30:00.000Z",
      "type": "accept",
      "provider": "ollama",
      "totalLines": 3,
      "acceptedLines": 3
    },
    {
      "timestamp": "2026-04-11T10:35:00.000Z",
      "type": "partial",
      "provider": "openrouter",
      "totalLines": 5,
      "acceptedLines": 2
    }
  ]
}
```

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| HTTP request cancellation | Custom timeout logic + manual fetch cleanup | AbortController + fetch(signal) | AbortController is standard, prevents partial response buffering |
| CodeMirror decoration rendering | Custom DOM overlays via innerHTML | Decoration.mark() + StateField | Overlay breaks undo/redo; StateField integrates with transactions |
| Real-time keystroke debouncing | setTimeout callback management | Svelte runes ($effect with cleanup) | Runes auto-cleanup; setTimeout requires manual tracking |
| Settings persistence | Multiple localStorage calls | Single JSON file + debounced save | localStorage is per-origin; workspace files are portable and backup-friendly |
| Error classification for fallback | String matching on error.message | Dedicated error type system | String matching is brittle; type-safe errors survive refactors |
| Token counting for context budget | Approximation (divide by 4) | js-tiktoken (already imported) | js-tiktoken is accurate to OpenAI's tokenizer; estimates are off by ~10-30% |

**Key insight:** The codebase already handles several of these patterns (debounce in documents.ts, decorations in document-validation.ts, persistence in notes-io.ts). Phase 9 should reuse those structures rather than inventing new ones. The novel part is CodeMirror ghost text + partial acceptance state machine, which is worth implementing correctly because it directly affects UX (flicker, cursor jumps, undo breakage).

---

## Common Pitfalls

### Pitfall 1: Suggestion Decoration Breaks Undo/Redo

**What goes wrong:** User accepts suggestion, document content changes, but undo history doesn't include the suggestion insertion as a single transaction. User presses Ctrl+Z, gets document before suggestion but loses cursor position or gets partial content.

**Why it happens:** If suggestion is appended to document content directly (not via transaction), CodeMirror doesn't track it as a single edit. Or if acceptance is split across multiple separate `dispatch()` calls, each becomes a separate undo step.

**How to avoid:** Always commit suggestion via a single `state.update({ changes: ... })` transaction. Use StateField + StateEffect pattern (not direct DOM manipulation). Test undo/redo with multi-line suggestions.

**Warning signs:** User reports "undo deleted only part of my suggestion" or "suggestion appeared but undo doesn't go back to before suggestion."

**Reference:** CodeMirror 6 transactions documentation; existing Phase 8 decoration pattern in document-validation.ts doesn't modify document content (only marks text), so undo is unaffected. Phase 9 must be careful to insert suggestion content via transaction.

---

### Pitfall 2: Fallback Chain Causes Infinite Retry Loop

**What goes wrong:** Primary provider fails (temporary network issue), fallback fires and tries backup provider. Backup succeeds. Next suggestion request: primary provider still unavailable, fallback again. User sees "Falling back to X" toast every suggestion. If backup also fails intermittently, could get cascade of fallback notifications.

**Why it happens:** Fallback logic doesn't distinguish "temporary outage" from "configuration error". Retry logic doesn't back off. No state tracking of provider health.

**How to avoid:** 
1. Classify errors: network timeouts are temporary; invalid API keys are permanent.
2. Retry primary on next request (don't switch permanently after one failure).
3. Suppress fallback notification if same provider fails twice in a row (de-dupe).
4. Limit fallback attempts per request: if all providers fail, show error once (not per retry).

**Warning signs:** Toast spam; user sees "Falling back" 5 times for a single keystroke.

**Reference:** Pattern 4 classifyError() function demonstrates this.

---

### Pitfall 3: Ghost Text Decoration Persists After Acceptance

**What goes wrong:** User accepts suggestion. Ghost text disappears briefly, but then reappears. Or ghost text appears after next keystroke, even though suggestion was consumed.

**Why it happens:** StateField decoration isn't cleared after suggestion is committed. Or decoration ranges are computed based on stale suggestion text.

**How to avoid:** 
1. Clear suggestion from store immediately after committing.
2. Re-compute decoration only when suggestion state changes.
3. Test: accept suggestion, verify ghost text gone, keystroke again, no ghost text should appear.

**Warning signs:** "Accepted suggestion but text still shows in gray."

**Reference:** Pattern 2 StateField.provide() must check for null suggestion before creating decorations.

---

### Pitfall 4: Token Budget Validation Causes P95 Latency Spike

**What goes wrong:** Suggestion context is 500 tokens. User selects 5 papers to use as context. Suggestion service calls tokenCount() on each paper abstract before making LLM request. js-tiktoken can be slow on first import (~200ms). Next suggestion request is now >500ms (timeout-adjacent).

**Why it happens:** Token validation is in the hot path. js-tiktoken first-import is lazy-loaded and slow. No caching of token counts.

**How to avoid:** 
1. Cache token counts for papers (store in metadata or memory).
2. Run token validation in parallel with suggestion request start (don't block).
3. Consider moving token budget validation to context-selection store setup (not per-request).

**Warning signs:** Latency jumps unexpectedly. User sees loading indicator >1s even though network is fast.

**Reference:** js-tiktoken is imported on demand in OpenRouterProvider.tokenCount(). Phase 9 should cache results.

---

### Pitfall 5: Settings Page Doesn't Persist Fallback Chain Changes

**What goes wrong:** User opens Settings, changes fallback provider order (e.g., "Primary: OpenRouter, Fallback: Ollama"). Clicks Save. Closes Settings. Next suggestion request: still uses old order.

**Why it happens:** Settings are updated in Svelte store but never written to disk. Or Tauri invoke('save_settings') fails silently.

**How to avoid:** 
1. Test settings persistence: open Settings, change a value, close app, restart app, verify setting persisted.
2. Log errors from save attempt (don't silently fail).
3. Debounce saves to avoid thrashing I/O (Pattern 5 does this).

**Warning signs:** User reports "Settings don't stick" or "I set fallback order but it reset."

**Reference:** Pattern 5 includes debounced save() and error logging.

---

## Code Examples

Verified patterns from existing codebase and official CodeMirror docs:

### Example 1: Debounce + Abort Pattern (from Phase 8)

```typescript
// Source: src/lib/stores/documents.ts:76-102 (reuse pattern)
let pendingSave: ReturnType<typeof setTimeout> | null = null
let isSaving = false

export async function saveDocument(
  workspacePath: string,
  docId: string,
  title: string,
  content: string
) {
  if (pendingSave) clearTimeout(pendingSave)

  if (!isSaving) {
    pendingSave = setTimeout(async () => {
      isSaving = true
      try {
        await ioSaveDocument(workspacePath, docId, content)
        // ... metadata save
      } finally {
        isSaving = false
        pendingSave = null
      }
    }, 300)
  }
}
```

Apply same pattern to suggestion requests: replace setTimeout save with fetch request + AbortController.

---

### Example 2: CodeMirror Decoration with Range

```typescript
// Source: src/lib/components/editor/CodeMirrorDecorations.ts
import { Decoration } from '@codemirror/view'

const redUnderlineMark = Decoration.mark({
  class: 'citation-error',
  attributes: { title: 'Paper not found.' }
})

export function createDecorationRanges(links: LinkMetadata[]) {
  const ranges: any[] = []
  for (const link of links) {
    if (link.status === 'missing') {
      const startPos = link.position
      const endPos = startPos + (link.content?.length ?? 0)
      if (endPos > startPos) {
        ranges.push(redUnderlineMark.range(startPos, endPos))
      }
    }
  }
  return ranges
}
```

Phase 9 adapts this for ghost text: instead of mark(), use Decoration.replace() with a widget.

---

### Example 3: Context Selection Integration

```typescript
// Source: src/lib/stores/context-selection.ts
export const selectedItems = derived(contextState, ($state) => {
  return $state.availableItems.filter((item) => $state.selectedIds.has(item.id))
})

export const totalTokens = derived(selectedItems, ($items) => {
  return $items.reduce((sum, item) => sum + item.tokens, 0)
})

// Phase 9 reuses this: suggestion request reads selectedItems + totalTokens
// to validate context budget before LLM call
```

---

### Example 4: Keystroke Event Handling (from DocumentEditor)

```typescript
// Source: src/lib/components/editor/NotesEditor.svelte:59-64
function handleKeydown(e: KeyboardEvent) {
  if ((e.ctrlKey || e.metaKey) && e.key === 's') {
    e.preventDefault()
    handleAutoSave(content)
  }
}
```

Phase 9 extends this for suggestion acceptance:
```typescript
function handleKeydown(e: KeyboardEvent) {
  if (e.key === 'Tab' && suggestionActive) {
    e.preventDefault()
    commitSuggestion()
  } else if (e.key === 'Escape' && suggestionActive) {
    e.preventDefault()
    clearSuggestion()
  }
}
```

---

### Example 5: LLM Provider Streaming

```typescript
// Source: src/lib/services/llm/ollama.ts:15-91
async *chat(messages: Message[], options: ChatOptions = {}): AsyncIterable<string> {
  const response = await fetch(`${OLLAMA_BASE}/api/chat`, {
    method: 'POST',
    body: JSON.stringify({...}),
    signal: options.signal  // AbortController support
  })

  const reader = response.body.getReader()
  let buffer = ''

  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    
    buffer += decoder.decode(value, { stream: true })
    // Process JSON-per-line...
    yield json.message.content
  }
}
```

Phase 9 must pass AbortSignal to provider.chat():
```typescript
const suggestion = await streamSuggestion(
  provider.chat(messages, {
    signal: abortController.signal,
    temperature: 0.5
  })
)
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Ollama only, no fallback | Multi-provider (Ollama + OpenRouter) + fallback chain | Phase 9 (new) | Users get better LLM choice + reliability |
| No inline suggestions | Context-aware suggestions with ghost text | Phase 9 (new) | Speeds up writing; conservative display prevents distraction |
| Manual provider selection each time | Settings page with persistent config | Phase 9 (new) | Better UX; reduces friction |
| No visibility into fallback | Toast notifications when fallback occurs | Phase 9 (new) | User trusts the system (knows what's running) |
| No metrics on suggestion quality | Local-only telemetry (opt-in) | Phase 9 (new) | Development insights without privacy cost |

---

## Open Questions

1. **CodeMirror 6 StateField Custom Widget Styling**
   - What we know: Decoration.replace() can use WidgetType.toDOM() to return custom HTML
   - What's unclear: How to style ghost text so it's visibly "not real" (grayed out, italic, dashed underline) without CSS being overridden by editor theme?
   - Recommendation: Test CSS specificity; use !important sparingly; check svelte-codemirror-editor theme prop if it applies global styles

2. **Transaction-Based Suggestion Acceptance + Cursor Position**
   - What we know: state.update({ changes: { insert } }) creates transaction
   - What's unclear: Does cursor position update correctly after insertion? Or does user's cursor jump?
   - Recommendation: Test with real editor; if cursor jumps, use setSelection() in same transaction to move cursor to end of inserted text

3. **Partial Acceptance UI / Keybinding**
   - What we know: User should be able to accept line-by-line
   - What's unclear: How does user interact? (Shift+Tab for per-line? Hover to highlight line? Up/Down arrows to navigate lines?)
   - Recommendation: Keep Tab for "accept all"; Shift+Tab for "reject current line"; no per-line preview (too complex for MVP). Test with users.

4. **Token Budget Enforcement**
   - What we know: Phase 9 ROADMAP says "limit to 500 tokens"
   - What's unclear: Should Phase 9 validate this before every request? Or let LLM timeout and treat as user feedback that context is too large?
   - Recommendation: Validate in Suggestion service (quiet check, no toast); log if context exceeds 500T; let user adjust context selection if needed. Don't block request on token count (just inform).

5. **Ollama + Qwen2 Instruction Following**
   - What we know: Default Ollama model is qwen2:0.5b (small, local)
   - What's unclear: Does qwen2:0.5b produce good suggestions for writing? Or is it too "noisy" / low quality?
   - Recommendation: User can switch models via Settings (future refinement). For MVP, use qwen2:0.5b and measure acceptance rate; if <30%, consider defaulting to OpenRouter instead.

---

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Ollama (local) | Default suggestion provider | ✓ | Running (http://localhost:11434) | Switch to OpenRouter |
| OpenRouter API | Cloud suggestion provider | ✓ | API endpoint (https://openrouter.ai) | Use Ollama only |
| fetch API | HTTP requests (streaming) | ✓ | Native browser | — |
| AbortController | Request cancellation | ✓ | Native browser (modern) | TimeoutError fallback (less clean) |
| Tauri invoke | Settings/telemetry I/O | ✓ | @tauri-apps/api v2 | — |
| js-tiktoken | Token counting | ✓ | 1.0.21 (package.json) | Fallback to char/4 approximation |

**Missing dependencies with no fallback:** None — all optional dependencies have fallbacks or are already installed.

**Missing dependencies with fallback:**
- Ollama: fallback to OpenRouter (if API key configured)
- OpenRouter: fallback to Ollama (if running)
- js-tiktoken first-import slowness: cache token counts (mitigation, not fallback)

---

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | vitest 4.0.18 (same as existing tests) |
| Config file | vitest.config.ts (already configured for jsdom) |
| Quick run command | `npm test -- tests/services/suggestion.test.ts --run` |
| Full suite command | `npm test` |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| SUGG-01 | 300ms debounce + keystroke idle triggers request | unit | `npm test -- tests/services/suggestion-debounce.test.ts --run` | ❌ Wave 0 |
| SUGG-02 | Context selection (papers + notes) passed to LLM | unit | `npm test -- tests/services/suggestion-context.test.ts --run` | ❌ Wave 0 |
| SUGG-03 | Ghost text decoration renders without breaking undo/redo | integration | `npm test -- tests/components/suggestion-decoration.test.ts --run` | ❌ Wave 0 |
| SUGG-04 | Tab/Escape keybindings accept/reject suggestion | integration | `npm test -- tests/components/suggestion-acceptance.test.ts --run` | ❌ Wave 0 |
| SUGG-05 | Accepted suggestion committed to doc via transaction | integration | `npm test -- tests/stores/suggestion-commit.test.ts --run` | ❌ Wave 0 |
| SUGG-06 | Provider.chat() called with correct message format | unit | `npm test -- tests/services/suggestion-provider.test.ts --run` | ❌ Wave 0 |
| SUGG-07 | Loading toast shown if >1s (jest useFakeTimers) | unit | `npm test -- tests/services/suggestion-timeout.test.ts --run` | ❌ Wave 0 |
| SUGG-08 | context-selection store selectedItems used in request | integration | `npm test -- tests/stores/context-selection-suggestion.test.ts --run` | ❌ Wave 0 |
| LLM-MULTI-01 | Provider fallback chain attempted in order | unit | `npm test -- tests/services/fallback-chain.test.ts --run` | ❌ Wave 0 |
| LLM-MULTI-02 | User can switch provider + fallback chain persists in settings | integration | `npm test -- tests/stores/settings-persistence.test.ts --run` | ❌ Wave 0 |
| LLM-MULTI-03 | OpenRouter API key stored via Tauri invoke | unit (mocked invoke) | `npm test -- tests/stores/api-key-storage.test.ts --run` | ❌ Wave 0 |

### Sampling Rate
- **Per task commit:** `npm test -- tests/services/suggestion-debounce.test.ts tests/services/fallback-chain.test.ts --run` (core logic)
- **Per wave merge:** `npm test` (full suite)
- **Phase gate:** Full suite green + manual acceptance test (user tries Tab to accept suggestion, Escape to reject)

### Wave 0 Gaps

**Testing infrastructure needed before implementation:**
- [ ] `tests/services/suggestion-debounce.test.ts` — Debounce timer + request queueing (use vitest fake timers)
- [ ] `tests/services/fallback-chain.test.ts` — Error classification + provider retry (mock LLMProvider)
- [ ] `tests/services/suggestion-context.test.ts` — Context budget validation (mock context-selection store)
- [ ] `tests/components/suggestion-decoration.test.ts` — StateField + decoration rendering (mock CodeMirror editor)
- [ ] `tests/components/suggestion-acceptance.test.ts` — Keybinding handlers + transaction commit (jsdom + mock editor)
- [ ] `tests/stores/settings-persistence.test.ts` — Settings load/save via Tauri invoke (mock invoke)
- [ ] `tests/stores/api-key-storage.test.ts` — API key encryption/storage (mock invoke + tauri-plugin-store pattern)
- [ ] `tests/stores/suggestion-commit.test.ts` — Transaction-based insertion preserves undo/redo
- [ ] `tests/services/suggestion-timeout.test.ts` — 10s timeout + abort behavior
- [ ] `tests/stores/context-selection-suggestion.test.ts` — selectedItems integration with suggestion request

**Setup requirements:**
- Mock @codemirror/view and @codemirror/state (add to tests/setup.ts if not present)
- Mock Tauri invoke for settings/telemetry I/O
- Add vitest fake timers config (already in vitest.config.ts with globals: true)

*(No existing test files cover suggestion logic — all are Wave 0 gaps)*

---

## Sources

### Primary (HIGH confidence)
- Phase 8 code (DocumentEditor.svelte, document-validation.ts, CodeMirrorDecorations.ts) — CodeMirror 6 integration + decoration patterns verified
- Existing llm-provider.ts + OllamaProvider + OpenRouterProvider — Provider abstraction + streaming + error handling
- svelte-codemirror-editor v2.1.0 + @codemirror/view 6.40.0 — Package.json verified versions
- CodeMirror 6 documentation (official) — StateField + StateEffect + Decoration API
- @tauri-apps/api v2 documentation — invoke() for Rust backend I/O
- Vitest 4.0.18 (configured in vitest.config.ts) — Test framework with jsdom environment

### Secondary (MEDIUM confidence)
- js-tiktoken 1.0.21 — Token counting (verified in OpenRouterProvider usage)
- Svelte 5 store patterns (writable + derived) — Existing stores (papers, notes, context-selection) demonstrate pattern
- AbortController (MDN + browser standard) — Request cancellation is standard; both providers already support signal parameter

### Tertiary (LOW confidence)
- Qwen2:0.5b suggestion quality — Assumption based on Phase 8 discussion; no empirical quality data yet. Should measure acceptance rate in Phase 9 Week 1.
- CodeMirror 6 ghost text widget styling — Widget rendering is standard; CSS cascading behavior depends on theme application (needs test)

---

## Metadata

**Confidence breakdown:**
- **Standard Stack:** HIGH — All libs already used or in package.json; versions verified
- **Architecture Patterns:** HIGH — Reuse proven patterns from Phase 8 (debounce, decorations, stores); fallback chain pattern is standard
- **CodeMirror Decoration:** MEDIUM — Decoration.mark() is well-documented; ghost text widget + partial acceptance state machine is novel (not tested yet)
- **Settings/Telemetry:** HIGH — Reuse workspace I/O patterns (documents.ts, notes.ts)
- **Pitfalls:** MEDIUM — Based on common CodeMirror + state management issues; some are educated guesses (not empirical)

**Research date:** 2026-04-11  
**Valid until:** 2026-04-25 (14 days — LLM libraries move fast; CodeMirror 6 API stable)

---

## Key Decisions for Planner

1. **Suggestion Service Architecture:** Create `src/lib/services/suggestion.ts` wrapping LLM providers with fallback chain + error classification + telemetry. Don't embed fallback logic in each provider.

2. **Ghost Text via StateField:** Use CodeMirror StateField + StateEffect (not plain DOM overlay) to preserve undo/redo atomicity. Test transaction-based insertion thoroughly.

3. **Settings/Telemetry I/O:** Leverage existing Tauri invoke pattern + workspace path. Store in `.anya/settings.json` and `.anya/telemetry.json` (alongside existing `.anya/` files). Use debounced Svelte store subscriptions for persistence.

4. **Provider Fallback Chain:** Implement in SuggestionProviderChain service (not in LLMProvider interface). Classify errors (connection vs. auth vs. timeout). Retry primary on next request (don't permanently switch).

5. **Testing Strategy:** Test infrastructure is complete gap (Wave 0). Need mocks for CodeMirror editor, Tauri invoke, and LLM providers before implementation. Focus tests on debounce logic, error handling, and transaction atomicity (high-risk areas).

6. **Token Budget Validation:** Validate in suggestion service (log but don't block). Cache token counts to avoid repeated js-tiktoken calls. Not a hard blocker for suggestion, but monitor latency p95.

7. **Keybinding:** Tab to accept all lines; Escape to reject. Shift+Tab optional for per-line rejection (complexity vs. UX trade-off; can defer if MVP timeline pressures). Default keybindings; make configurable via Settings.

