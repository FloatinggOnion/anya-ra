import type { LLMProvider, Message, Model, ChatOptions } from '../../types/llm'

/**
 * OpenAI cloud provider.
 * Uses SSE (Server-Sent Events) streaming format.
 * API key stored securely via Tauri keystore.
 */
export class OpenAIProvider implements LLMProvider {
  constructor(private readonly apiKey: string) {}

  /**
   * Stream a chat response from OpenAI using SSE format.
   * Lines start with "data: " prefix; final line is "data: [DONE]".
   */
  async *chat(messages: Message[], options: ChatOptions = {}): AsyncIterable<string> {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: options.model || 'gpt-3.5-turbo',
        messages,
        stream: true,
        temperature: options.temperature ?? 0.7,
        top_p: options.topP ?? 0.9
      })
    })

    if (!response.ok) {
      const errText = await response.text().catch(() => response.statusText)
      if (response.status === 401) {
        throw new Error('Invalid OpenAI API key. Check your key in Provider Settings.')
      }
      if (response.status === 429) {
        throw new Error('OpenAI rate limit exceeded. Please wait and try again.')
      }
      throw new Error(`OpenAI request failed (${response.status}): ${errText}`)
    }

    if (!response.body) {
      throw new Error('OpenAI response has no body')
    }

    const reader = response.body.getReader()
    const decoder = new TextDecoder()
    let buffer = ''

    try {
      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })

        // SSE: split by newlines
        const lines = buffer.split('\n')
        buffer = lines.pop() ?? ''

        for (const line of lines) {
          const trimmed = line.trim()
          if (!trimmed || !trimmed.startsWith('data: ')) continue

          const dataStr = trimmed.slice(6) // Remove "data: " prefix

          if (dataStr === '[DONE]') return

          try {
            const json = JSON.parse(dataStr)
            const content = json.choices?.[0]?.delta?.content
            if (content) {
              yield content
            }
          } catch {
            // Skip malformed SSE lines
            console.debug('Skipping malformed SSE line:', dataStr.slice(0, 50))
          }
        }
      }
    } finally {
      reader.releaseLock()
    }
  }

  /**
   * Return hardcoded OpenAI model list (no public listing API).
   */
  async models(): Promise<Model[]> {
    return [
      { id: 'gpt-3.5-turbo', name: 'GPT-3.5 Turbo', contextWindow: 4096, size: 0 },
      { id: 'gpt-4', name: 'GPT-4', contextWindow: 8192, size: 0 },
      { id: 'gpt-4-turbo', name: 'GPT-4 Turbo', contextWindow: 128000, size: 0 },
      { id: 'gpt-4o', name: 'GPT-4o', contextWindow: 128000, size: 0 }
    ]
  }

  /**
   * Count tokens using js-tiktoken (OpenAI's own tokenizer).
   */
  async tokenCount(text: string): Promise<number> {
    try {
      const { getEncoding } = await import('js-tiktoken')
      const enc = getEncoding('cl100k_base')
      const tokens = enc.encode(text)
      // Note: enc.free() removed - not available in all js-tiktoken versions
      return tokens.length
    } catch (err) {
      console.warn('tiktoken failed, using estimate:', err)
      return Math.ceil(text.length / 4)
    }
  }

  /**
   * Provider is available when an API key is present (no HTTP check).
   */
  async isAvailable(): Promise<boolean> {
    return !!this.apiKey && this.apiKey.trim().length > 0
  }
}
