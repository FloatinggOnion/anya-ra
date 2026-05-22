import type { SuggestionService } from '../services/suggestions'

/**
 * Shared SuggestionService instance — initialized by MainPanel when the LLM provider
 * becomes available. SuggestionsSidebar reads this to trigger LLM generation.
 * Svelte 5 runes module-level $state — fully reactive.
 */
export let service: SuggestionService | null = $state(null)

export function setSuggestionService(s: SuggestionService | null) { service = s }
