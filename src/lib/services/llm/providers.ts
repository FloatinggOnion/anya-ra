import type { LLMProvider } from '../../types/llm'
import { OllamaProvider } from './ollama'

export type ProviderType = 'ollama' | 'openrouter' | 'llamacpp'

export interface ProviderConfig {
  apiKey?: string
  ollamaHost?: string
  ollamaPort?: number
  llamaCppHost?: string
  llamaCppPort?: number
  llamaCppModelPath?: string
  llamaCppBinaryPath?: string
}

export function createProvider(type: ProviderType, config?: ProviderConfig): LLMProvider {
  if (type === 'ollama') return new OllamaProvider(config?.ollamaHost, config?.ollamaPort)
  if (type === 'llamacpp') {
    const { LlamaCppProvider } = require('./llamacpp')
    return new LlamaCppProvider({
      host: config?.llamaCppHost ?? 'localhost',
      port: config?.llamaCppPort ?? 8000,
      modelPath: config?.llamaCppModelPath
    })
  }
  throw new Error('OpenRouter provider requires async import. Use createProviderAsync().')
}

export async function createProviderAsync(
  type: ProviderType,
  config?: ProviderConfig
): Promise<LLMProvider> {
  if (type === 'ollama') return new OllamaProvider(config?.ollamaHost, config?.ollamaPort)
  if (type === 'llamacpp') {
    const { LlamaCppProvider } = await import('./llamacpp')
    return new LlamaCppProvider({
      host: config?.llamaCppHost ?? 'localhost',
      port: config?.llamaCppPort ?? 8000,
      modelPath: config?.llamaCppModelPath
    })
  }
  if (type === 'openrouter') {
    if (!config?.apiKey) throw new Error('OpenRouter requires an API key')
    const { OpenRouterProvider } = await import('./openrouter')
    return new OpenRouterProvider(config.apiKey)
  }
  throw new Error(`Unknown provider type: ${type as string}`)
}

export { OllamaProvider } from './ollama'
export { LlamaCppProvider } from './llamacpp'
