import type { LLMProvider, Message, Model, ChatOptions } from '../../types/llm'

/**
 * Ollama local LLM provider.
 * Uses browser fetch + ReadableStream for streaming responses.
 * JSON-per-line format: each chunk is a complete JSON object followed by newline.
 */
export class OllamaProvider implements LLMProvider {
  private baseUrl: string
  private model: string | null

  constructor(host: string = 'localhost', port: number = 11434, model?: string | null) {
    this.baseUrl = `http://${host}:${port}`
    this.model = model || null
  }
  /**
   * Stream a chat response from Ollama.
   * Handles partial-line buffering for robust JSON-per-line parsing.
   */
  async *chat(messages: Message[], options: ChatOptions = {}): AsyncIterable<string> {
    if (!options.model) {
      throw new Error('Ollama requires a model to be specified in ChatOptions')
    }

    const response = await fetch(`${this.baseUrl}/api/chat`, {
      method: 'POST',
      signal: options.signal,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: options.model,
        messages,
        stream: true,
        options: {
          temperature: options.temperature ?? 0.7,
          top_p: options.topP ?? 0.9,
          num_predict: options.maxTokens ?? -1
        }
      })
    })

    if (!response.ok) {
      const errText = await response.text().catch(() => response.statusText)
      if (response.status === 404) {
        throw new Error(
          `Model not found: ${options.model}. Run: ollama pull ${options.model}\n${errText}`
        )
      }
      throw new Error(`Ollama request failed (${response.status}): ${errText}`)
    }

    if (!response.body) {
      throw new Error('Ollama response has no body')
    }

    const reader = response.body.getReader()
    const decoder = new TextDecoder()
    let buffer = ''

    try {
      while (true) {
        const { done, value } = await reader.read()

        if (done) break

        buffer += decoder.decode(value, { stream: true })

        // Process complete lines; keep the last incomplete line in buffer
        const lines = buffer.split('\n')
        buffer = lines.pop() ?? '' // Last element may be incomplete

        for (const line of lines) {
          const trimmed = line.trim()
          if (!trimmed) continue

          try {
            const json = JSON.parse(trimmed)

            if (json.error) {
              throw new Error(`Ollama error: ${json.error}`)
            }

            if (json.done === true) {
              return
            }

            if (json.message?.content) {
              yield json.message.content
            }
          } catch (parseErr) {
            if (parseErr instanceof SyntaxError) {
              // Partial JSON fragment — skip silently
              console.debug('Skipping partial JSON fragment:', trimmed.slice(0, 50))
            } else {
              throw parseErr
            }
          }
        }
      }
    } finally {
      reader.releaseLock()
    }
  }

  /**
   * List installed Ollama models.
   */
  async models(): Promise<Model[]> {
    const response = await fetch(`${this.baseUrl}/api/tags`, {
      signal: AbortSignal.timeout(5000)
    })

    if (!response.ok) {
      throw new Error(`Failed to list Ollama models (${response.status})`)
    }

    const data = await response.json()
    return (data.models ?? []).map((m: { name: string; size: number }) => ({
      id: m.name,
      name: m.name,
      contextWindow: 32000, // Qwen2 default; exact value varies by model
      size: m.size ?? 0
    }))
  }

  /**
   * Count tokens using Ollama's tokenize endpoint.
   * Requires a model to be set (passed to constructor or via chat call).
   */
  async tokenCount(text: string): Promise<number> {
    if (!this.model) {
      throw new Error('Ollama tokenize requires a model to be set')
    }

    const response = await fetch(`${this.baseUrl}/api/tokenize`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: this.model, prompt: text }),
      signal: AbortSignal.timeout(5000)
    })

    if (!response.ok) {
      throw new Error(`Ollama tokenize failed (${response.status})`)
    }

    const data = await response.json()
    return data.tokens?.length ?? Math.ceil(text.length / 4)
  }

  /**
   * Check if Ollama is running (2-second timeout).
   */
  async isAvailable(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/api/tags`, {
        signal: AbortSignal.timeout(2000)
      })
      return response.ok
    } catch {
      return false
    }
  }

  /**
   * Pull a model from Ollama with progress streaming.
   * Yields progress strings as the model downloads.
   */
  async *pullModel(modelName: string): AsyncIterable<string> {
    const response = await fetch(`${this.baseUrl}/api/pull`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: modelName, stream: true })
    })

    if (!response.ok || !response.body) {
      throw new Error(`Failed to pull model ${modelName}`)
    }

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
          if (!trimmed) continue
          try {
            const json = JSON.parse(trimmed)
            if (json.status) {
              yield json.status
            }
          } catch {
            // Skip invalid JSON
          }
        }
      }
    } finally {
      reader.releaseLock()
    }
  }
}
