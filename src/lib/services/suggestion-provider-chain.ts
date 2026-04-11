import type { LLMProvider, Message, ChatOptions } from '../types/llm'

export interface ProviderError {
  code: 'connection' | 'auth' | 'timeout' | 'unknown'
  message: string
  recoverable: boolean
}

/**
 * Error classifier for provider failures.
 * Distinguishes recoverable (connection, timeout) from terminal (auth) errors.
 * Per 09-CONTEXT.md Area 6: "auto-fallback if selected fails"
 */
function classifyError(err: unknown): ProviderError {
  if (err instanceof TypeError && err.message.includes('fetch')) {
    return {
      code: 'connection',
      message: 'Connection failed',
      recoverable: true
    }
  }

  if (err instanceof Error) {
    if (err.message.includes('Invalid') && err.message.includes('API key')) {
      return {
        code: 'auth',
        message: 'Invalid API key',
        recoverable: false  // Don't fallback on auth error
      }
    }
    if (err.message.includes('timeout')) {
      return {
        code: 'timeout',
        message: 'Request timed out',
        recoverable: true
      }
    }
  }

  return {
    code: 'unknown',
    message: String(err),
    recoverable: true
  }
}

/**
 * Wrapper around LLM providers implementing fallback chain.
 * Per 09-CONTEXT.md Area 6: User-selected primary provider with auto-fallback.
 *
 * Retry behavior: On next suggestion request, retry primary (don't permanently switch).
 */
export class SuggestionProviderChain {
  constructor(
    private primaryProvider: LLMProvider,
    private fallbackChain: LLMProvider[],
    private onFallback?: (message: string) => void  // Toast callback
  ) {}

  /**
   * Generate suggestion with automatic fallback chain.
   * If primary fails (recoverable error), try fallbacks.
   * If all fail, throw error (handled upstream).
   */
  async *generateSuggestion(
    messages: Message[],
    options: ChatOptions,
    signal: AbortSignal
  ): AsyncIterable<string> {
    const providers = [this.primaryProvider, ...this.fallbackChain]
    let lastError: ProviderError | null = null

    for (let i = 0; i < providers.length; i++) {
      const provider = providers[i]
      const isPrimary = i === 0

      try {
        // Check provider availability first
        const available = await provider.isAvailable()
        if (!available) {
          if (!isPrimary && this.onFallback) {
            this.onFallback(`Provider unavailable, trying next...`)
          }
          continue
        }

        // Stream response
        yield* provider.chat(messages, options)
        return  // Success!
      } catch (err) {
        const error = classifyError(err)
        lastError = error

        if (!error.recoverable) {
          // Terminal error (auth, etc.) — don't try fallback, propagate immediately
          throw err
        }

        if (!isPrimary && this.onFallback) {
          this.onFallback(`Provider failed: ${error.message}. Trying next...`)
        }

        // Try next provider
        if (i === providers.length - 1) {
          // All providers exhausted
          throw new Error(
            lastError
              ? `All suggestion providers failed: ${lastError.message}`
              : 'No providers available'
          )
        }
      }
    }

    throw new Error('No providers available')
  }
}
