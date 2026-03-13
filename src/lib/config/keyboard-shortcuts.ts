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
  { keys: ['Cmd', '\\'], description: 'Toggle sidebar', category: 'global' },
  { keys: ['Esc'], description: 'Close modal/dropdown', category: 'global' },

  // Editor (Notes tab)
  { keys: ['Cmd', 'S'], description: 'Save note', category: 'editor' },
  { keys: ['Cmd', 'E'], description: 'Export note', category: 'editor' },

  // Graph tab
  { keys: ['Cmd', '+'], description: 'Zoom in', category: 'graph' },
  { keys: ['Cmd', '-'], description: 'Zoom out', category: 'graph' },
  { keys: ['Cmd', '0'], description: 'Reset zoom', category: 'graph' },
  { keys: ['Cmd', 'F'], description: 'Fit to view', category: 'graph' },

  // Search
  { keys: ['Cmd', 'Enter'], description: 'Navigate to selected result', category: 'search' },
  { keys: ['↑', '↓'], description: 'Navigate results', category: 'search' },
]
