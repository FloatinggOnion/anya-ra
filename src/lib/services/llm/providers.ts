import type { LLMProvider } from '../../types/llm'
import { OllamaProvider } from './ollama'

export type ProviderType = 'ollama' | 'openai'

export interface ProviderConfig {
  apiKey?: string
}

/**
 * Factory function for creating LLM providers.
 * Returns a configured provider instance for the requested type.
 */
export function createProvider(type: ProviderType, config?: ProviderConfig): LLMProvider {
  if (type === 'ollama') {
    return new OllamaProvider()
  }

  if (type === 'openai') {
    // Lazy import to avoid loading OpenAI code until needed
    throw new Error(
      'OpenAI provider requires dynamic import. Use: import("./openai").then(m => new m.OpenAIProvider(apiKey))'
    )
  }

  throw new Error(`Unknown provider type: ${type as string}`)
}

/**
 * Async factory that properly handles dynamic provider imports.
 */
export async function createProviderAsync(
  type: ProviderType,
  config?: ProviderConfig
): Promise<LLMProvider> {
  if (type === 'ollama') {
    return new OllamaProvider()
  }

  if (type === 'openai') {
    if (!config?.apiKey) {
      throw new Error('OpenAI provider requires an API key')
    }
    const openaiModule = await import('./openai')
    return new openaiModule.OpenAIProvider(config.apiKey)
  }

  throw new Error(`Unknown provider type: ${type as string}`)
}

export { OllamaProvider } from './ollama'
