import type { SidebarSuggestionItem, PaperMatch } from '../types/suggestion'

// Module-level state (to be upgraded to Svelte 5 $state runes in Wave 2 UI integration)
let _papers: SidebarSuggestionItem[] = []
let _ideas: SidebarSuggestionItem[] = []
let _completions: SidebarSuggestionItem[] = []
let _isGenerating: boolean = false

// Public getters — reactive in Svelte 5 when upgraded to $state runes
export const sidebarPapers = { get current() { return _papers } }
export const sidebarIdeas = { get current() { return _ideas } }
export const sidebarCompletions = { get current() { return _completions } }
export const sidebarGenerating = { get current() { return _isGenerating } }

/** Set paper matches from PaperKeywordMatcher results. Called continuously on content change. */
export function setPaperMatches(matches: PaperMatch[]): void {
  _papers = matches.slice(0, 5).map(m => ({
    id: `paper-${m.paperId}-${Date.now()}`,
    type: 'paper' as const,
    label: 'Papers',
    content: `${m.title}${m.year ? ` (${m.year})` : ''} — ${m.authors.slice(0, 3).join(', ')}`,
    timestamp: Date.now(),
    source: 'paper-keyword' as const,
    paper: { id: m.paperId, title: m.title, authors: m.authors, year: m.year, relevanceScore: m.relevanceScore }
  }))
}

/** Set LLM-generated ideas. Called after boundary detection or manual trigger. */
export function setIdeas(items: SidebarSuggestionItem[]): void { _ideas = items }

/** Set LLM-generated text completions. Called after boundary detection or manual trigger. */
export function setCompletions(items: SidebarSuggestionItem[]): void { _completions = items }

/** Set generating state (shows spinners in sidebar) */
export function setGenerating(v: boolean): void { _isGenerating = v }

/** Clear all suggestions */
export function clearAll(): void { _papers = []; _ideas = []; _completions = []; _isGenerating = false }
