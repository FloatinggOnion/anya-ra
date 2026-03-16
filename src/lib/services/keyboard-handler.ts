export interface KeyboardHandler {
  keys: string[]
  handler: (e: KeyboardEvent) => void
}

export function createKeyboardHandlers(onToggleShortcuts: () => void) {
  return {
    handleKeydown(e: KeyboardEvent) {
      const isMeta = e.metaKey || e.ctrlKey
      const key = e.key.toLowerCase()

      // Cmd+?: Toggle keyboard shortcuts panel
      if (isMeta && (e.shiftKey && key === '/')) {
        e.preventDefault()
        onToggleShortcuts()
      }
    },
  }
}
