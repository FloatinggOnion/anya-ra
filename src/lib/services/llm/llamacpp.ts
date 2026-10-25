import type { LLMProvider, Message, Model, ChatOptions } from '../../types/llm'
import { parseGGUFFilename, formatFileSize } from '../models/gguf-parser'

export interface LlamaCppConfig {
  host: string
  port: number
  modelPath?: string
}

export class LlamaCppProvider implements LLMProvider {
  private baseUrl: string
  private modelPath: string | null
  private model: string | null = null

  constructor(config: LlamaCppConfig) {
    this.baseUrl = `http://${config.host}:${config.port}`
    this.modelPath = config.modelPath || null
  }

  async *chat(messages: Message[], options: ChatOptions = {}): AsyncIterable<string> {
    const response = await fetch(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      signal: options.signal,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messages,
        stream: true,
        temperature: options.temperature ?? 0.7,
        top_p: options.topP ?? 0.9,
        max_tokens: options.maxTokens ?? 2048
      })
    })

    if (!response.ok) {
      const errText = await response.text().catch(() => response.statusText)
      if (response.status === 404) {
        throw new Error(`Model not loaded in llama.cpp. Ensure server is running with model: ${this.modelPath}\n${errText}`)
      }
      throw new Error(`llama.cpp request failed (${response.status}): ${errText}`)
    }

    if (!response.body) {
      throw new Error('llama.cpp response has no body')
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

  async models(): Promise<Model[]> {
    try {
      const response = await fetch(`${this.baseUrl}/models`, {
        signal: AbortSignal.timeout(2000)
      })

      if (!response.ok) {
        throw new Error(`Failed to list llama.cpp models (${response.status})`)
      }

      const data = await response.json()
      const modelList = data.data ?? []

      if (modelList.length === 0) {
        return []
      }

      // llama.cpp serves one model at a time; return the loaded model with metadata
      const loadedModel = modelList[0]
      const metadata = this.modelPath ? parseGGUFFilename(this.modelPath) : null

      return [
        {
          id: loadedModel.id ?? 'unknown',
          name: loadedModel.id ?? 'Loaded Model',
          contextWindow: 4096, // Default; llama.cpp doesn't expose this easily
          size: metadata?.fileSize ?? 0
        }
      ]
    } catch (error) {
      throw new Error(`Failed to list llama.cpp models: ${error instanceof Error ? error.message : 'unknown error'}`)
    }
  }

  async tokenCount(text: string): Promise<number> {
    try {
      const response = await fetch(`${this.baseUrl}/tokenize`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: text }),
        signal: AbortSignal.timeout(5000)
      })

      if (!response.ok) {
        throw new Error(`Failed to tokenize (${response.status})`)
      }

      const data = await response.json()
      return data.tokens?.length ?? Math.ceil(text.length / 4)
    } catch (error) {
      return Math.ceil(text.length / 4)
    }
  }

  async isAvailable(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/health`, {
        signal: AbortSignal.timeout(2000)
      })
      return response.ok
    } catch {
      return false
    }
  }

  getModelMetadata() {
    if (!this.modelPath) return null
    return parseGGUFFilename(this.modelPath)
  }

  getModelInfo() {
    if (!this.modelPath) {
      return {
        fileName: 'No model selected',
        quantization: null,
        parameterCount: null,
        fileSize: 0,
        fileSizeFormatted: '0 B'
      }
    }

    const metadata = this.getModelMetadata()
    // Note: fileSize is fetched separately via Tauri; storing 0 here as placeholder
    return {
      fileName: this.modelPath.split('/').pop() || this.modelPath,
      quantization: metadata?.quantization || 'Unknown',
      parameterCount: metadata?.parameterCount || 'Unknown',
      fileSize: 0,
      fileSizeFormatted: 'Computing...'
    }
  }
}
