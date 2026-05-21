// Suggestion request lifecycle
export interface Suggestion {
  id: string  // UUID for tracking
  docId: string
  text: string  // Full suggestion text
  lines: string[]  // Split by \n for partial acceptance tracking
  provider: 'ollama' | 'openrouter'  // Which provider generated it
  position: { line: number; col: number }  // Cursor position when generated
  generatedAt: number  // Unix timestamp (for latency p95 tracking)
  state: 'pending' | 'accepted' | 'rejected' | 'partial'
  acceptedLines: Set<number>  // Line indices user accepted (for partial)
}

export interface SuggestionRequest {
  requestId: string
  abortController: AbortController
  timeoutHandle: ReturnType<typeof setTimeout>
  docId: string
  startTime: number  // Unix timestamp for latency measurement
}

// Settings (from 09-CONTEXT.md Area 2 + Area 6 + Area 8)
export interface SuggestionSettings {
  enabled: boolean
  displayMode: 'ghost' | 'block' | 'both'  // Ghost text styling preference
  acceptKeybinding: 'tab' | 'ctrl-enter' | 'cmd-enter'  // Area 2: configurable keybinding
  llmProvider: 'ollama' | 'openrouter'  // Area 6: user-selected primary
  fallbackChain: Array<'ollama' | 'openrouter'>  // Area 6: fallback order
  telemetryOptIn: boolean  // Area 8: local-only opt-in toggle
  ollamaModel: string | null  // User-selected model from installed; null = auto-select on next dialog open
  openrouterModel: string  // Free-text model ID; defaults to 'openai/gpt-4o-mini'
  ollamaHost: string  // Host for Ollama API; defaults to 'localhost'
  ollamaPort: number  // Port for Ollama API; defaults to 11434
}

export interface Settings {
  suggestions: SuggestionSettings
  // Future: theme, workspace preferences
}

// Telemetry (from 09-CONTEXT.md Area 8)
export interface TelemetryRecord {
  docId: string
  provider: 'ollama' | 'openrouter'
  type: 'accept' | 'reject' | 'partial'
  lineCount: number  // Suggestion lines (for partial: lineCount is total, acceptedCount in accept)
  acceptedCount?: number  // For partial acceptance
  timestamp: number  // Unix timestamp
}

export interface TelemetryStats {
  totalSuggestions: number
  accepted: number
  rejected: number
  partial: number
  acceptanceRate: number  // accepted / (accepted + rejected + partial)
  byProvider: Record<'ollama' | 'openrouter', {
    count: number
    acceptanceRate: number
  }>
}
