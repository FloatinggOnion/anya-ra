import { writable, derived, get } from 'svelte/store'
import { papers } from './papers'
import { notes } from './notes'
import { registerContextGetter } from '../stores/chat'

export interface ContextItem {
  id: string
  type: 'paper' | 'note'
  title: string
  content: string
  tokens: number
}

export interface ContextState {
  availableItems: ContextItem[]
  selectedIds: Set<string>
}

const initialState: ContextState = {
  availableItems: [],
  selectedIds: new Set<string>()
}

export const contextState = writable<ContextState>(initialState)

// Sync availableItems with actual papers and notes, removing deleted items
export const availableItems = derived([papers, notes], ([$papers, $notes]) => {
  const items: ContextItem[] = []
  
  // Add all papers as context items
  for (const paper of $papers) {
    items.push({
      id: `paper-${paper.id}`,
      type: 'paper',
      title: paper.title,
      content: paper.abstract || paper.title,
      tokens: Math.ceil((paper.abstract?.length || 0) / 4) // Rough estimate: 1 token ≈ 4 chars
    })
  }
  
  // Add all notes as context items
  for (const [paperId, sidecar] of $notes.entries()) {
    for (const note of sidecar.notes) {
      const resolvedPaperId = note.paperId || paperId
      const content = note.content || ''
      items.push({
        id: `note-${note.id}`,
        type: 'note',
        title: `Notes: ${$papers.find(p => p.id === resolvedPaperId)?.title || 'Unknown Paper'}`,
        content,
        tokens: Math.ceil(content.length / 4)
      })
    }
  }
  
  return items
})

// Update contextState's availableItems when papers/notes change
availableItems.subscribe((newItems) => {
  contextState.update((state) => {
    // Remove selectedIds that no longer exist in availableItems
    const validIds = new Set(newItems.map((item) => item.id))
    const newSelectedIds = new Set(
      Array.from(state.selectedIds).filter((id) => validIds.has(id))
    )
    return { ...state, availableItems: newItems, selectedIds: newSelectedIds }
  })
})

export const selectedItems = derived(contextState, ($state) => {
  return $state.availableItems.filter((item) => $state.selectedIds.has(item.id))
})

export const totalTokens = derived(selectedItems, ($items) => {
  return $items.reduce((sum, item) => sum + item.tokens, 0)
})

export function toggleContextItem(id: string) {
  contextState.update((state) => {
    const newSelectedIds = new Set(state.selectedIds)
    if (newSelectedIds.has(id)) {
      newSelectedIds.delete(id)
    } else {
      newSelectedIds.add(id)
    }
    return { ...state, selectedIds: newSelectedIds }
  })
}

export function clearContext() {
  contextState.update((state) => ({
    ...state,
    selectedIds: new Set<string>()
  }))
}

export function selectAll() {
  contextState.update((state) => ({
    ...state,
    selectedIds: new Set(state.availableItems.map((item) => item.id))
  }))
}

// Register getter with chat store to avoid circular dependency
// This runs once when this module is first imported
registerContextGetter(() => get(selectedItems))
