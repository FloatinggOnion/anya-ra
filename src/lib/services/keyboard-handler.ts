import { activeTab } from '../stores/ui'
import { graph } from '../stores/graph'
import { get } from 'svelte/store'

export interface KeyboardHandler {
  keys: string[]
  handler: (e: KeyboardEvent) => void
}

export function createKeyboardHandlers(onToggleShortcuts: () => void) {
  return {
    handleKeydown(e: KeyboardEvent) {
      const isMeta = e.metaKey || e.ctrlKey
      const key = e.key.toLowerCase()

      // Global shortcuts
      if (isMeta && key === 'k') {
        e.preventDefault()
        onToggleShortcuts()
        return
      }

      // Cmd+?: Toggle keyboard shortcuts panel
      if (isMeta && (e.shiftKey && key === '/')) {
        e.preventDefault()
        onToggleShortcuts()
        return
      }

      // Cmd+\ : Toggle sidebar
      if (isMeta && (e.key === '\\' || e.key === '|')) {
        e.preventDefault()
        // TODO: Implement sidebar toggle
        return
      }

      // Tab-specific shortcuts
      const currentTab = get(activeTab)

      if (currentTab === 'notes') {
        // Cmd+S: Save note
        if (isMeta && key === 's') {
          e.preventDefault()
          // TODO: Trigger note save
          return
        }

        // Cmd+E: Export note
        if (isMeta && key === 'e') {
          e.preventDefault()
          // TODO: Trigger note export
          return
        }
      }

      if (currentTab === 'graph') {
        // Cmd++: Zoom in
        if (isMeta && (key === '+' || key === '=')) {
          e.preventDefault()
          graph.update(g => ({ ...g, zoom: (g.zoom || 1) * 1.2 }))
          return
        }

        // Cmd+-: Zoom out
        if (isMeta && key === '-') {
          e.preventDefault()
          graph.update(g => ({ ...g, zoom: (g.zoom || 1) / 1.2 }))
          return
        }

        // Cmd+0: Reset zoom
        if (isMeta && key === '0') {
          e.preventDefault()
          graph.update(g => ({ ...g, zoom: 1 }))
          return
        }

        // Cmd+F: Fit to view (prevents browser search)
        if (isMeta && key === 'f') {
          e.preventDefault()
          // TODO: Implement fit-to-view
          return
        }
      }
    },
  }
}
