import { writable, get } from 'svelte/store'
import type { LLMProvider } from '../types/llm'
import { OllamaProvider } from '../services/llm/ollama'
import { invoke } from '@tauri-apps/api/core'
import { settings } from './settings'
import { LlamaCppProvider } from '../services/llm/llamacpp'
import { detectLlamaCppBinary, launchServer, isServerReady } from '../services/system/llamacpp-launcher'

export interface ProviderState {
  type: 'ollama' | 'openrouter' | 'llamacpp'
  provider: LLMProvider | null
  apiKey: string | null
  error: string | null
  serverStarting?: boolean
}

const initialState: ProviderState = {
  type: 'ollama',
  provider: null,
  apiKey: null,
  error: null
}

export const providerState = writable<ProviderState>(initialState)

export async function initializeProvider(): Promise<void> {
  if (get(providerState).provider) return
  try {
    let apiKey: string | null = null
    try {
      apiKey = await invoke<string | null>('load_api_key', { service: 'openrouter' })
    } catch {
      // Keystore may not be available yet — ignore
    }

    const settingsVal = get(settings)
    if (settingsVal.suggestions.llmProvider === 'openrouter' && apiKey) {
      await switchProvider('openrouter', apiKey)
      return
    }
    if (settingsVal.suggestions.llmProvider === 'llamacpp') {
      await switchProvider('llamacpp')
      return
    }
    const provider = new OllamaProvider(settingsVal.suggestions.ollamaHost, settingsVal.suggestions.ollamaPort)
    const available = await provider.isAvailable()

    if (available) {
      if (!settingsVal.suggestions.ollamaModel) {
        try {
          const models = await provider.models()
          if (models.length > 0) {
            settings.update((s) => ({
              ...s,
              suggestions: { ...s.suggestions, ollamaModel: models[0].id }
            }))
          }
        } catch {
          // Model fetch failed — user will need to select manually
        }
      }

      providerState.set({ type: 'ollama', provider, apiKey, error: null })
    } else {
      providerState.set({
        type: 'ollama',
        provider: null,
        apiKey,
        error: 'Ollama not running. Start Ollama and refresh, or switch to OpenRouter.'
      })
    }
  } catch (err) {
    providerState.update((s) => ({
      ...s,
      error: err instanceof Error ? err.message : 'Failed to initialize provider'
    }))
  }
}

export async function switchProvider(
  type: 'ollama' | 'openrouter' | 'llamacpp',
  apiKey?: string
): Promise<void> {
  try {
    let provider: LLMProvider
    const settingsVal = get(settings)

    if (type === 'ollama') {
      provider = new OllamaProvider(settingsVal.suggestions.ollamaHost, settingsVal.suggestions.ollamaPort)
      const available = await provider.isAvailable()
      if (!available) throw new Error('Ollama is not running. Start Ollama and try again.')
    } else if (type === 'llamacpp') {
      if (!settingsVal.suggestions.llamaCppModel) {
        throw new Error('Please select a model file (.gguf or .bin) first.')
      }

      provider = new LlamaCppProvider({
        host: settingsVal.suggestions.llamaCppHost,
        port: settingsVal.suggestions.llamaCppPort,
        modelPath: settingsVal.suggestions.llamaCppModel
      })

      // Check if server is running; if not, try to auto-start
      let available = await provider.isAvailable()
      if (!available && settingsVal.suggestions.llamaCppBinaryPath) {
        providerState.update((s) => ({ ...s, serverStarting: true }))
        try {
          await launchServer(
            settingsVal.suggestions.llamaCppBinaryPath,
            settingsVal.suggestions.llamaCppModel,
            settingsVal.suggestions.llamaCppPort
          )
          const ready = await isServerReady(
            settingsVal.suggestions.llamaCppHost,
            settingsVal.suggestions.llamaCppPort
          )
          available = ready
        } catch (launchErr) {
          throw new Error(`Failed to start llama.cpp: ${launchErr instanceof Error ? launchErr.message : 'unknown error'}`)
        }
      }

      if (!available) {
        throw new Error('llama.cpp server is not running. Check binary path or start server manually.')
      }
    } else {
      if (!apiKey?.trim()) throw new Error('OpenRouter requires an API key')
      const { OpenRouterProvider } = await import('../services/llm/openrouter')
      provider = new OpenRouterProvider(apiKey)
    }

    providerState.update((s) => ({
      ...s,
      type,
      provider,
      apiKey: apiKey || s.apiKey,
      error: null,
      serverStarting: false
    }))
    settings.update(s => ({ ...s, suggestions: { ...s.suggestions, llmProvider: type } }))
  } catch (err) {
    providerState.update((s) => ({
      ...s,
      error: err instanceof Error ? err.message : 'Failed to switch provider',
      serverStarting: false
    }))
  }
}

export async function setApiKey(service: 'openrouter', apiKey: string): Promise<void> {
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
