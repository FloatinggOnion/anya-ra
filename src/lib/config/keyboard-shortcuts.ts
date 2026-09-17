/**
 * Keyboard shortcuts configuration
 */

export interface KeyboardShortcut {
  keys: string[]
  description: string
  category: 'global' | 'navigation' | 'editor' | 'search' | 'papers' | 'graph' | 'chat' | 'export'
}

export const KEYBOARD_SHORTCUTS: KeyboardShortcut[] = [
  // Global
  { keys: ['Cmd', 'K'], description: 'Open search', category: 'global' },
  { keys: ['Cmd', '?'], description: 'Show keyboard shortcuts', category: 'global' },
  { keys: ['Esc'], description: 'Close modal/dropdown', category: 'global' },

  // Search
  { keys: ['Cmd', 'Enter'], description: 'Navigate to selected result', category: 'search' },
  { keys: ['↑', '↓'], description: 'Navigate results', category: 'search' },

  // Navigation (tabs / panels)
  { keys: ['Cmd', '1'], description: 'Focus tab 1', category: 'navigation' },
  { keys: ['Cmd', '2'], description: 'Focus tab 2', category: 'navigation' },
  { keys: ['Cmd', '3'], description: 'Focus tab 3', category: 'navigation' },
  { keys: ['Cmd', '4'], description: 'Focus tab 4', category: 'navigation' },
  { keys: ['Cmd', '5'], description: 'Focus tab 5', category: 'navigation' },
  { keys: ['Cmd', '6'], description: 'Focus tab 6', category: 'navigation' },
  { keys: ['Cmd', 'Shift', '['], description: 'Previous tab', category: 'navigation' },
  { keys: ['Cmd', 'Shift', ']'], description: 'Next tab', category: 'navigation' },
  { keys: ['Ctrl', 'Tab'], description: 'Focus next panel', category: 'navigation' },

  // Global
  { keys: ['Cmd', 'Shift', 'P'], description: 'Open command palette', category: 'global' },
  { keys: ['Cmd', '/'], description: 'Show help', category: 'global' },

  // Editor
  { keys: ['Cmd', 'N'], description: 'New note', category: 'editor' },
  { keys: ['Cmd', 'S'], description: 'Save', category: 'editor' },
  { keys: ['Cmd', 'E'], description: 'Edit', category: 'editor' },

  // Search
  { keys: ['Cmd', 'Shift', 'F'], description: 'Focus search', category: 'search' },

  // Papers
  { keys: ['Cmd', 'Shift', 'N'], description: 'Focus paper search', category: 'papers' },

  // Graph
  { keys: ['Cmd', 'Shift', 'G'], description: 'Focus graph', category: 'graph' },

  // Chat
  { keys: ['Cmd', 'Shift', 'C'], description: 'Focus chat', category: 'chat' },

  // Export
  { keys: ['Cmd', 'D'], description: 'Download PDF', category: 'export' },
  { keys: ['Cmd', 'Shift', 'E'], description: 'Export workspace', category: 'export' },
]
