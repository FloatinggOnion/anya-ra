import type { LLMProvider } from '../../types/llm'
import { OllamaProvider } from './ollama'

export type ProviderType = 'ollama' | 'openrouter'

export interface ProviderConfig {
  apiKey?: string
}

export function createProvider(type: ProviderType, config?: ProviderConfig): LLMProvider {
  if (type === 'ollama') return new OllamaProvider()
  throw new Error('OpenRouter provider requires async import. Use createProviderAsync().')
}

export async function createProviderAsync(
  type: ProviderType,
  config?: ProviderConfig
): Promise<LLMProvider> {
  if (type === 'ollama') return new OllamaProvider()
  if (type === 'openrouter') {
    if (!config?.apiKey) throw new Error('OpenRouter requires an API key')
    const { OpenRouterProvider } = await import('./openrouter')
    return new OpenRouterProvider(config.apiKey)
  }
  throw new Error(`Unknown provider type: ${type as string}`)
}

export { OllamaProvider } from './ollama'
