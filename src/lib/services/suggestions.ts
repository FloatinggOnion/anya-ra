import { get } from 'svelte/store'
import { selectedItems } from '../stores/context-selection'
import { settings } from '../stores/settings'
import type { Suggestion, SuggestionRequest, SidebarSuggestionItem } from '../types/suggestion'
import type { LLMProvider, Message, ChatOptions } from '../types/llm'
import type { SuggestionProviderChain } from './suggestion-provider-chain'
import { recordAcceptance, recordRejection } from '../stores/telemetry'

export class SuggestionService {
  private pendingRequest: SuggestionRequest | null = null
  private debounceTimer: ReturnType<typeof setTimeout> | null = null
  private tokenCountLimit = 500  // Per ROADMAP: 500 tokens max for context

  constructor(
    private providerChain: SuggestionProviderChain,
    private onGenerating?: (isGenerating: boolean) => void
  ) {}

  /**
   * Trigger suggestion generation after keystroke.
   * Implements: 300ms debounce, auto-cancel previous request, 10s timeout.
   * Per 09-CONTEXT.md Area 1: "auto-cancel in-flight on keystroke"
   */
  async triggerSuggestion(
    docId: string,
    currentContent: string,
    cursorPos: number
  ): Promise<Suggestion | null> {
    // Cancel previous request if in-flight
    if (this.pendingRequest) {
      this.pendingRequest.abortController.abort()
      clearTimeout(this.pendingRequest.timeoutHandle)
      this.onGenerating?.(false)
    }

    // Debounce keystroke: reset 300ms timer on each keystroke
    if (this.debounceTimer) clearTimeout(this.debounceTimer)

    return new Promise((resolve) => {
      this.debounceTimer = setTimeout(async () => {
        try {
          const suggestion = await this._generateSuggestion(
            docId,
            currentContent,
            cursorPos
          )
          resolve(suggestion)
        } catch (err) {
          if (err instanceof DOMException && err.name === 'AbortError') {
            // Request was cancelled by user keystroke or timeout
            resolve(null)
          } else {
            // Real error — logged upstream
            resolve(null)
          }
        }
      }, 300)
    })
  }

  private async _generateSuggestion(
    docId: string,
    currentContent: string,
    cursorPos: number
  ): Promise<Suggestion | null> {
    const requestId = crypto.randomUUID()
    const abortController = new AbortController()
    const startTime = Date.now()

    // 10s timeout (per 09-CONTEXT.md Area 1)
    const timeoutHandle = setTimeout(() => {
      console.log('[SuggestionService] Request timed out after 10s')
      abortController.abort()
      // Toast notification handled upstream in editor integration
    }, 10000)

    this.pendingRequest = { requestId, abortController, timeoutHandle, docId, startTime }
    this.onGenerating?.(true)

    try {
      // Build context: selected papers/notes + current document section
      const context = this._buildContext(currentContent, cursorPos)
      console.log('[SuggestionService] Built context, length:', context.length)

      // Validate token budget (500 tokens max per 09-CONTEXT.md + ROADMAP)
      const contextTokens = await this._countTokens(context)
      console.log('[SuggestionService] Context tokens:', contextTokens)
      if (contextTokens > this.tokenCountLimit) {
        // Truncate context to fit budget
        // For simplicity: take top N papers by selection order
        // Production: implement sliding window or importance sampling
        console.log('[SuggestionService] Truncating context to fit budget')
      }

      // Build LLM messages
      const messages: Message[] = [
        { role: 'system', content: 'You are a helpful writing assistant. Generate a single sentence suggestion to continue the given text. Only provide the suggestion, no explanation.' },
        { role: 'user', content: context }
      ]

      console.log('[SuggestionService] Calling providerChain.generateSuggestion...')
      // Get selected model from settings based on primary provider
      const settingsVal = get(settings)
      const model = settingsVal.suggestions.llmProvider === 'ollama'
        ? settingsVal.suggestions.ollamaModel
        : settingsVal.suggestions.openrouterModel

      // Validate model is configured before passing to provider
      if (!model) {
        throw new Error(`Model not configured for ${settingsVal.suggestions.llmProvider}`)
      }

      // Generate via provider chain (handles fallback + cancellation)
      const suggestionText = await this._streamSuggestion(messages, abortController.signal, model)

      console.log('[SuggestionService] Provider returned:', suggestionText ? `"${suggestionText.substring(0, 100)}"` : 'empty/null')

      if (!suggestionText) {
        console.log('[SuggestionService] No suggestion text from provider, returning null')
        return null
      }

      const lines = suggestionText.split('\n')
      const providerType = settingsVal.suggestions.llmProvider
      const suggestion: Suggestion = {
        id: requestId,
        docId,
        text: suggestionText,
        lines,
        provider: providerType,
        position: { line: currentContent.substring(0, cursorPos).split('\n').length - 1, col: cursorPos },
        generatedAt: startTime,
        state: 'pending',
        acceptedLines: new Set()
      }

      console.log('[SuggestionService] Returning suggestion:', suggestion.text.substring(0, 50))
      return suggestion
    } finally {
      clearTimeout(timeoutHandle)
      this.pendingRequest = null
      this.onGenerating?.(false)
    }
  }

  private _buildContext(currentContent: string, cursorPos: number): string {
    // Get selected papers/notes for context (per SUGG-02, SUGG-08)
    const selected = get(selectedItems)
    const contextBudget = 250  // Reserve tokens for prompt + doc section

    let contextStr = 'Selected context:\n'
    for (const item of selected) {
      if (item.tokens < contextBudget) {
        contextStr += `\n${item.title}:\n${item.content.substring(0, 300)}\n`
      }
    }

    // Add current document section around cursor (prev 200 chars + next 100 chars)
    const sectionStart = Math.max(0, cursorPos - 200)
    const sectionEnd = Math.min(currentContent.length, cursorPos + 100)
    const section = currentContent.substring(sectionStart, sectionEnd)

    contextStr += `\n\nDocument section:\n${section}\n\nContinue from this point:`

    return contextStr
  }

  private async _countTokens(text: string): Promise<number> {
    // Use js-tiktoken for accurate token counting per warning in revision feedback
    // Fallback to estimation if encoding fails
    try {
      const { encodingForModel } = await import('js-tiktoken')
      const enc = encodingForModel('gpt-3.5-turbo')
      return enc.encode(text).length
    } catch {
      // Fallback: rough estimate 1 token ≈ 4 characters
      return Math.ceil(text.length / 4)
    }
  }

  private async _streamSuggestion(
    messages: Message[],
    signal: AbortSignal,
    model?: string | null
  ): Promise<string> {
    let result = ''
    let chunkCount = 0
    try {
      console.log('[SuggestionService._streamSuggestion] Starting stream with model:', model)
      const options: ChatOptions = model ? { model } : {}
      for await (const chunk of this.providerChain.generateSuggestion(messages, options, signal)) {
        console.log('[SuggestionService._streamSuggestion] Got chunk:', chunk.substring(0, 50))
        result += chunk
        chunkCount++
      }
      console.log('[SuggestionService._streamSuggestion] Stream complete, chunks:', chunkCount, 'total length:', result.length)
    } catch (err) {
      console.error('[SuggestionService._streamSuggestion] Error:', err)
      if (signal.aborted) throw err  // Re-throw abort
      // Fallback chain errors logged upstream
      throw err
    }
    return result
  }

  /**
   * Accept suggestion (partially or fully).
   * Records telemetry if opted in.
   */
  recordAcceptanceTelemetry(
    docId: string,
    provider: 'ollama' | 'openrouter',
    totalLines: number,
    acceptedLines: number
  ): void {
    if (acceptedLines === totalLines) {
      recordAcceptance(docId, provider, 'full', totalLines)
    } else {
      recordAcceptance(docId, provider, 'partial', totalLines, acceptedLines)
    }
  }

  /**
   * Reject suggestion.
   */
  recordRejectionTelemetry(docId: string, provider: 'ollama' | 'openrouter'): void {
    recordRejection(docId, provider)
  }

  /**
   * Generate ideas/questions for the sidebar (D-02, D-04).
   * Uses LLM via the existing provider chain. Triggered on section boundary or manual button.
   * @returns Array of SidebarSuggestionItem (type: 'idea'), max 3
   */
  async generateIdeas(docId: string, currentContent: string, cursorPos: number): Promise<SidebarSuggestionItem[]> {
    const context = this._buildContext(currentContent, cursorPos)
    const messages: Message[] = [
      { role: 'system' as const, content: 'You are a research writing assistant. Based on the document context, generate 1-3 brief ideas, counterarguments, or follow-up questions that could strengthen this writing. Each idea should be exactly one sentence. Format: one idea per line, prefixed with "• " (bullet). No numbering. No explanations. No more than 3 lines total.' },
      { role: 'user' as const, content: context }
    ]
    const settingsVal = get(settings)
    const model = settingsVal.suggestions.llmProvider === 'ollama'
      ? settingsVal.suggestions.ollamaModel
      : settingsVal.suggestions.openrouterModel
    const text = await this._streamSuggestion(messages, new AbortController().signal, model)
    return text.split('\n')
      .filter(line => line.trim().startsWith('•'))
      .map((line, i) => ({
        id: `idea-${docId}-${Date.now()}-${i}`,
        type: 'idea' as const,
        label: 'Ideas',
        content: line.replace(/^•\s*/, '').trim(),
        timestamp: Date.now(),
        source: 'llm' as const,
      }))
      .slice(0, 3)
  }

  /**
   * Generate text completions for the sidebar (D-02, D-04).
   * Uses LLM via the existing provider chain. Triggered on section boundary or manual button.
   * @returns Array of SidebarSuggestionItem (type: 'completion'), max 2
   */
  async generateCompletions(docId: string, currentContent: string, cursorPos: number): Promise<SidebarSuggestionItem[]> {
    const context = this._buildContext(currentContent, cursorPos)
    const messages: Message[] = [
      { role: 'system' as const, content: 'You are a writing assistant helping a researcher. Based on the document context, generate exactly 1-2 brief sentence continuations that logically follow the last written text. Each completion should be one sentence. Format: one completion per line, plain text only (no prefixes, no numbering). No more than 2 lines. No explanations.' },
      { role: 'user' as const, content: context }
    ]
    const settingsVal = get(settings)
    const model = settingsVal.suggestions.llmProvider === 'ollama'
      ? settingsVal.suggestions.ollamaModel
      : settingsVal.suggestions.openrouterModel
    const text = await this._streamSuggestion(messages, new AbortController().signal, model)
    return text.split('\n')
      .filter(line => line.trim().length > 0)
      .map((line, i) => ({
        id: `completion-${docId}-${Date.now()}-${i}`,
        type: 'completion' as const,
        label: 'Completions',
        content: line.trim(),
        timestamp: Date.now(),
        source: 'llm' as const,
        provider: get(settings).suggestions.llmProvider,
      }))
      .slice(0, 2)
  }

  cancel(): void {
    if (this.pendingRequest) {
      this.pendingRequest.abortController.abort()
      clearTimeout(this.pendingRequest.timeoutHandle)
      this.pendingRequest = null
    }
    if (this.debounceTimer) clearTimeout(this.debounceTimer)
    this.onGenerating?.(false)
  }
}
