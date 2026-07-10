/**
 * Shared cursor position store for cross-component cursor tracking.
 * NotesEditor writes here via DocumentEditor, SuggestionsSidebar reads from here.
 * Svelte 5 runes module-level $state — exported as a stable object since
 * Svelte 5 disallows exporting a reassigned $state binding directly.
 */
export const cursorState = $state({
  pos: 0,
  docId: null as string | null
})

export function setCursor(pos: number) { cursorState.pos = pos }
export function setCursorDoc(docId: string | null) { cursorState.docId = docId }
