import type { LLMProvider, Message, Model, ChatOptions } from '../../types/llm'

const OPENROUTER_BASE = 'https://openrouter.ai/api/v1'

/**
 * OpenRouter cloud provider — access 100+ models (OpenAI, Anthropic, Google, Meta, etc.)
 * via a single OpenAI-compatible API. Uses SSE streaming format.
 * API key stored securely via Tauri keystore.
 * See: https://openrouter.ai/docs
 */
export class OpenRouterProvider implements LLMProvider {
  constructor(private readonly apiKey: string) {}

  async *chat(messages: Message[], options: ChatOptions = {}): AsyncIterable<string> {
    const response = await fetch(`${OPENROUTER_BASE}/chat/completions`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://github.com/anya-ra',
        'X-Title': 'Anya-RA'
      },
      body: JSON.stringify({
        model: options.model || 'openai/gpt-4o-mini',
        messages,
        stream: true,
        temperature: options.temperature ?? 0.7,
        top_p: options.topP ?? 0.9
      })
    })

    if (!response.ok) {
      const errText = await response.text().catch(() => response.statusText)
      if (response.status === 401) {
        throw new Error('Invalid OpenRouter API key. Get one at openrouter.ai/keys')
      }
      if (response.status === 402) {
        throw new Error('OpenRouter account has insufficient credits.')
      }
      if (response.status === 429) {
        throw new Error('OpenRouter rate limit exceeded. Please wait and try again.')
      }
      throw new Error(`OpenRouter request failed (${response.status}): ${errText}`)
    }

    if (!response.body) throw new Error('OpenRouter response has no body')

    const reader = response.body.getReader()
    const decoder = new TextDecoder()
    let buffer = ''

    try {
      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() ?? ''

        for (const line of lines) {
          const trimmed = line.trim()
          if (!trimmed || !trimmed.startsWith('data: ')) continue
          const dataStr = trimmed.slice(6)
          if (dataStr === '[DONE]') return
          try {
            const json = JSON.parse(dataStr)
            const content = json.choices?.[0]?.delta?.content
            if (content) yield content
          } catch {
            console.debug('Skipping malformed SSE line:', dataStr.slice(0, 50))
          }
        }
      }
    } finally {
      reader.releaseLock()
    }
  }

  /**
   * Fetch available models from OpenRouter API.
   * Falls back to a curated list if the request fails.
   */
  async models(): Promise<Model[]> {
    try {
      const response = await fetch(`${OPENROUTER_BASE}/models`, {
        headers: { Authorization: `Bearer ${this.apiKey}` }
      })
      if (!response.ok) throw new Error('Failed to fetch models')
      const data = await response.json()
      return (data.data ?? []).map((m: { id: string; name: string; context_length?: number }) => ({
        id: m.id,
        name: m.name,
        contextWindow: m.context_length ?? 8192,
        size: 0
      }))
    } catch {
      return this.fallbackModels()
    }
  }

  private fallbackModels(): Model[] {
    return [
      { id: 'openai/gpt-4o-mini',                    name: 'GPT-4o Mini',              contextWindow: 128000, size: 0 },
      { id: 'openai/gpt-4o',                          name: 'GPT-4o',                   contextWindow: 128000, size: 0 },
      { id: 'anthropic/claude-3.5-sonnet',            name: 'Claude 3.5 Sonnet',        contextWindow: 200000, size: 0 },
      { id: 'anthropic/claude-3-haiku',               name: 'Claude 3 Haiku',           contextWindow: 200000, size: 0 },
      { id: 'google/gemini-flash-1.5',                name: 'Gemini 1.5 Flash',         contextWindow: 1000000, size: 0 },
      { id: 'meta-llama/llama-3.1-70b-instruct',      name: 'Llama 3.1 70B',            contextWindow: 131072, size: 0 },
      { id: 'mistralai/mistral-7b-instruct',          name: 'Mistral 7B Instruct',      contextWindow: 32768, size: 0 }
    ]
  }

  async tokenCount(text: string): Promise<number> {
    try {
      const { getEncoding } = await import('js-tiktoken')
      const enc = getEncoding('cl100k_base')
      const tokens = enc.encode(text)
      return tokens.length
    } catch {
      return Math.ceil(text.length / 4)
    }
  }

  async isAvailable(): Promise<boolean> {
    return !!this.apiKey && this.apiKey.trim().length > 0
  }
}
