// Suggestion request lifecycle
export interface Suggestion {
  id: string  // UUID for tracking
  docId: string
  text: string  // Full suggestion text
  lines: string[]  // Split by \n for partial acceptance tracking
  provider: 'ollama' | 'openrouter' | 'llamacpp'  // Which provider generated it
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
  llmProvider: 'ollama' | 'openrouter' | 'llamacpp'  // Area 6: user-selected primary
  fallbackChain: Array<'ollama' | 'openrouter' | 'llamacpp'>  // Area 6: fallback order
  telemetryOptIn: boolean  // Area 8: local-only opt-in toggle
  ollamaModel: string | null  // User-selected model from installed; null = auto-select on next dialog open
  openrouterModel: string  // Free-text model ID; defaults to 'openai/gpt-4o-mini'
  ollamaHost: string  // Host for Ollama API; defaults to 'localhost'
  ollamaPort: number  // Port for Ollama API; defaults to 11434
  llamaCppModel: string | null  // Path to .gguf model file
  llamaCppHost: string  // Host for llama.cpp API; defaults to 'localhost'
  llamaCppPort: number  // Port for llama.cpp API; defaults to 8000
  llamaCppBinaryPath: string | null  // Path to llama.cpp server binary (auto-detected or user-specified)
  citationStyle: CitationStyle
  sidebarLayout: 'sectioned' | 'unified'
}

export interface Settings {
  suggestions: SuggestionSettings
  // Future: theme, workspace preferences
}

// Telemetry (from 09-CONTEXT.md Area 8)
export interface TelemetryRecord {
  docId: string
  provider: 'ollama' | 'openrouter' | 'llamacpp'
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
  byProvider: Record<'ollama' | 'openrouter' | 'llamacpp', {
    count: number
    acceptanceRate: number
  }>
}

// ─── Sidebar Companion Types (Phase 9 UX Rethink) ──────────────────────

/** Suggestion card types displayed in the sidebar sections */
export type SuggestionCardType = 'paper' | 'idea' | 'completion'

/** A single suggestion item in the sidebar feed */
export interface SidebarSuggestionItem {
  id: string
  type: SuggestionCardType
  label: string
  content: string
  timestamp: number
  provider?: 'ollama' | 'openrouter' | 'llamacpp'
  source: 'paper-keyword' | 'llm'
  paper?: {
    id: string
    title: string
    authors: string[]
    year: number | null
    relevanceScore: number
  }
}

/** Citation style for paper reference insertion (D-07) */
export type CitationStyle = 'author-year' | 'cite-title' | 'footnote'

/** Match result from PaperKeywordMatcher */
export interface PaperMatch {
  paperId: string
  title: string
  authors: string[]
  year: number | null
  relevanceScore: number
  matchedKeywords: string[]
  llmRelevanceScore?: number     // Tier 2 LLM semantic re-rank score
  llmRationale?: string          // Tier 2 LLM re-rank rationale
}

/** Section boundary event emitted by SectionBoundaryDetector */
export interface SectionBoundaryEvent {
  docId: string
  content: string
  sectionText: string
  cursorPos: number
  timestamp: number
}
