/**
 * Keyboard shortcuts configuration
 */

export interface KeyboardShortcut {
  keys: string[]
  description: string
  category: 'global' | 'editor' | 'graph' | 'search'
}

export const KEYBOARD_SHORTCUTS: KeyboardShortcut[] = [
  // Global
  { keys: ['Cmd', 'K'], description: 'Open search', category: 'global' },
  { keys: ['Cmd', '?'], description: 'Show keyboard shortcuts', category: 'global' },
  { keys: ['Esc'], description: 'Close modal/dropdown', category: 'global' },

  // Search
  { keys: ['Cmd', 'Enter'], description: 'Navigate to selected result', category: 'search' },
  { keys: ['↑', '↓'], description: 'Navigate results', category: 'search' },
]
