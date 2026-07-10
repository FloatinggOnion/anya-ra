import type { SuggestionService } from '../services/suggestions'

/**
 * Shared SuggestionService instance — initialized by MainPanel when the LLM provider
 * becomes available. SuggestionsSidebar reads this to trigger LLM generation.
 * Svelte 5 runes module-level $state — exported as a stable object since
 * Svelte 5 disallows exporting a reassigned $state binding directly.
 */
export const suggestionSvc = $state({
  current: null as SuggestionService | null
})

export function setSuggestionService(s: SuggestionService | null) { suggestionSvc.current = s }
