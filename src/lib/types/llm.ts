/**
 * Core LLM provider abstraction layer.
 * All providers (Ollama, OpenAI, etc.) implement this interface.
 */

export interface Message {
  role: 'user' | 'assistant' | 'system'
  content: string
}

export interface Model {
  id: string
  name: string
  contextWindow: number
  size: number
}

export interface ChatOptions {
  model?: string
  temperature?: number
  topP?: number
}

/**
 * Unified provider interface enabling seamless switching between
 * Ollama (local) and cloud providers (OpenAI, Anthropic) without UI changes.
 */
export interface LLMProvider {
  /**
   * Stream a chat response as an async iterable of string chunks.
   * Each yielded string is a partial response fragment.
   */
  chat(messages: Message[], options: ChatOptions): AsyncIterable<string>

  /**
   * List available models from this provider.
   */
  models(): Promise<Model[]>

  /**
   * Count the number of tokens in the provided text.
   */
  tokenCount(text: string): Promise<number>

  /**
   * Check if the provider is reachable and ready to handle requests.
   */
  isAvailable(): Promise<boolean>
}
