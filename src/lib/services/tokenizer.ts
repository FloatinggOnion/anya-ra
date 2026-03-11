import type { LLMProvider } from '../types/llm'

/**
 * Quick token estimation using js-tiktoken (OpenAI cl100k_base encoding).
 * Not 100% accurate for Qwen/other models, but fast for real-time UI feedback.
 * Falls back to character-based estimate if tiktoken fails.
 */
export async function estimateTokens(text: string): Promise<number> {
  try {
    const { encodingForModel } = await import('js-tiktoken')
    const enc = encodingForModel('gpt-3.5-turbo')
    return enc.encode(text).length
  } catch (err) {
    console.warn('Token estimation failed, using fallback:', err)
    // Rough fallback: ~4 chars per token (commonly used heuristic)
    return Math.ceil(text.length / 4)
  }
}

/**
 * Accurate token count from the active provider.
 * Uses Ollama's /api/tokenize for local models (exact for Qwen).
 * Falls back to estimation if provider unavailable.
 */
export async function getAccurateTokenCount(
  text: string,
  provider: LLMProvider
): Promise<number> {
  try {
    return await provider.tokenCount(text)
  } catch (err) {
    console.warn('Accurate token count failed, falling back to estimate:', err)
    return estimateTokens(text)
  }
}

export interface ModelContextWindow {
  limit: number
  warningThreshold: number  // 75% of limit
  blockingThreshold: number // 90% of limit
}

/**
 * Return context window limits and warning thresholds for a given model.
 * Defaults to Qwen2's 32K context if model is unknown.
 */
export function getModelContextWindow(modelId: string): ModelContextWindow {
  const limits: Record<string, number> = {
    'qwen2:0.5b': 32000,
    'qwen2:1.5b': 32000,
    'qwen2:7b': 32000,
    'qwen2:72b': 32000,
    'llama2': 4096,
    'llama3': 8192,
    'llama3.1': 128000,
    'mistral': 32000,
    'gpt-3.5-turbo': 4096,
    'gpt-4': 8192,
    'gpt-4-turbo': 128000,
    'gpt-4o': 128000,
    'gpt-4o-mini': 128000
  }

  const limit = limits[modelId] ?? 32000 // Default to Qwen2 limit

  return {
    limit,
    warningThreshold: Math.floor(limit * 0.75),
    blockingThreshold: Math.floor(limit * 0.9)
  }
}

/**
 * Categorize token usage as safe, warning, or danger level.
 */
export function getTokenUsageLevel(tokens: number, limit: number): 'safe' | 'warning' | 'danger' {
  const ratio = tokens / limit
  if (ratio >= 0.9) return 'danger'
  if (ratio >= 0.75) return 'warning'
  return 'safe'
}
