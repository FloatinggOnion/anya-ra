import { writable } from 'svelte/store'
import type { LLMProvider } from '../types/llm'
import { OllamaProvider } from '../services/llm/ollama'
import { invoke } from '@tauri-apps/api/core'

export interface ProviderState {
  type: 'ollama' | 'openai'
  provider: LLMProvider | null
  apiKey: string | null
  error: string | null
}

const initialState: ProviderState = {
  type: 'ollama',
  provider: null,
  apiKey: null,
  error: null
}

export const providerState = writable<ProviderState>(initialState)

/**
 * Initialize provider on app startup.
 * Defaults to Ollama, loads saved OpenAI key from keystore.
 */
export async function initializeProvider(): Promise<void> {
  try {
    // Load saved OpenAI API key from keystore
    let apiKey: string | null = null
    try {
      apiKey = await invoke<string | null>('load_api_key', { service: 'openai' })
    } catch {
      // Keystore may not be available yet — ignore
    }

    // Default to Ollama
    const provider = new OllamaProvider()
    const available = await provider.isAvailable()

    if (available) {
      providerState.set({ type: 'ollama', provider, apiKey, error: null })
    } else {
      providerState.set({
        type: 'ollama',
        provider: null,
        apiKey,
        error: 'Ollama not running. Start Ollama and refresh, or switch to OpenAI.'
      })
    }
  } catch (err) {
    providerState.update((s) => ({
      ...s,
      error: err instanceof Error ? err.message : 'Failed to initialize provider'
    }))
  }
}

/**
 * Switch between Ollama and OpenAI providers.
 */
export async function switchProvider(
  type: 'ollama' | 'openai',
  apiKey?: string
): Promise<void> {
  try {
    let provider: LLMProvider

    if (type === 'ollama') {
      provider = new OllamaProvider()
      const available = await provider.isAvailable()
      if (!available) {
        throw new Error('Ollama is not running. Start Ollama and try again.')
      }
    } else {
      if (!apiKey?.trim()) {
        throw new Error('OpenAI requires an API key')
      }
      const { OpenAIProvider } = await import('../services/llm/openai')
      provider = new OpenAIProvider(apiKey)
    }

    providerState.update((s) => ({
      ...s,
      type,
      provider,
      apiKey: apiKey || s.apiKey,
      error: null
    }))
  } catch (err) {
    providerState.update((s) => ({
      ...s,
      error: err instanceof Error ? err.message : 'Failed to switch provider'
    }))
  }
}

/**
 * Save an API key to secure keystore and update provider state.
 */
export async function setApiKey(service: 'openai', apiKey: string): Promise<void> {
  try {
    await invoke('save_api_key', { service, apiKey })
    providerState.update((s) => ({ ...s, apiKey, error: null }))
  } catch (err) {
    providerState.update((s) => ({
      ...s,
      error: err instanceof Error ? err.message : 'Failed to save API key'
    }))
  }
}
