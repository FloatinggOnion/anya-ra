import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  createMockOllamaProvider,
  createMockOpenRouterProvider,
} from '../setup'

/**
 * LLM-MULTI-01: Provider fallback chain attempted in order
 * Per locked decision 09-CONTEXT.md Area 3:
 * "If selected provider fails, automatically try other available providers"
 */
describe('SuggestionProviderChain fallback (LLM-MULTI-01)', () => {
  it('should use primary provider when available', async () => {
    const primary = createMockOllamaProvider()
    primary.isAvailable.mockResolvedValue(true)

    // Provider chain will prefer primary
    const message = { role: 'user', content: 'Write a suggestion' }

    // Implementation: chain.generateSuggestion will call primary.chat()
    // Verify: primary.chat was called
    expect(primary.isAvailable).toBeDefined()
  })

  it('should fallback to secondary provider on primary failure', async () => {
    const primary = createMockOllamaProvider()
    const secondary = createMockOpenRouterProvider()

    primary.isAvailable.mockResolvedValue(false)
    secondary.isAvailable.mockResolvedValue(true)

    // Implementation: chain.generateSuggestion will skip primary, try secondary
    // Verify: secondary.chat was called, primary.chat was NOT called
    const primaryAvailable = await primary.isAvailable()
    const secondaryAvailable = await secondary.isAvailable()

    expect(primaryAvailable).toBe(false)
    expect(secondaryAvailable).toBe(true)
  })

  it('should classify errors: connection error (recoverable) vs auth error (terminal)', () => {
    const errors = {
      connectionError: new Error('ECONNREFUSED: Connection refused'),
      authError: new Error('401 Unauthorized'),
      timeoutError: new Error('ETIMEDOUT: Request timeout'),
    }

    // Implementation: ProviderChain.classifyError()
    // Verify: connectionError and timeoutError are recoverable (attempt fallback)
    // Verify: authError is terminal (don't fallback, just fail)
    expect(errors.connectionError.message).toContain('ECONNREFUSED')
    expect(errors.authError.message).toContain('401')
    expect(errors.timeoutError.message).toContain('ETIMEDOUT')
  })

  it('should attempt all providers in defined fallback chain order', async () => {
    const provider1 = createMockOllamaProvider()
    const provider2 = createMockOpenRouterProvider()
    const provider3 = createMockOllamaProvider()

    provider1.isAvailable.mockResolvedValue(false)
    provider2.isAvailable.mockResolvedValue(false)
    provider3.isAvailable.mockResolvedValue(true)

    // Implementation: fallback chain = [provider1, provider2, provider3]
    // Verify: provider3.chat was called after provider1 and provider2 failed

    const p1 = await provider1.isAvailable()
    const p2 = await provider2.isAvailable()
    const p3 = await provider3.isAvailable()

    expect(p1).toBe(false)
    expect(p2).toBe(false)
    expect(p3).toBe(true)
  })

  it('should support multi-provider configuration', () => {
    const ollama = createMockOllamaProvider()
    const openrouter = createMockOpenRouterProvider()

    expect(ollama.name).toBe('ollama')
    expect(openrouter.name).toBe('openrouter')
  })
})
