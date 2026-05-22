/**
 * Shared cursor position store for cross-component cursor tracking.
 * NotesEditor writes here via DocumentEditor, SuggestionsSidebar reads from here.
 * Svelte 5 runes module-level $state — fully reactive.
 */
export let cursorPos = $state(0)
export let cursorDocId: string | null = $state(null)

export function setCursor(pos: number) { cursorPos = pos }
export function setCursorDoc(docId: string | null) { cursorDocId = docId }
