export interface KeyboardHandler {
  keys: string[]
  handler: (e: KeyboardEvent) => void
}

export function createKeyboardHandlers(
  onToggleShortcuts: () => void,
  actions?: Record<string, () => void>,
) {
  function run(name: string, e: KeyboardEvent) {
    const fn = actions?.[name]
    if (fn) {
      e.preventDefault()
      fn()
    }
  }

  return {
    handleKeydown(e: KeyboardEvent) {
      const isMeta = e.metaKey || e.ctrlKey
      const key = e.key.toLowerCase()

      // Cmd+?: Toggle keyboard shortcuts panel
      if (isMeta && (e.shiftKey && key === '/')) {
        e.preventDefault()
        onToggleShortcuts()
        return
      }

      // Ctrl+Tab: focus next panel
      if (e.ctrlKey && key === 'tab') {
        run('focus-next-panel', e)
        return
      }

      if (!isMeta) return

      // Cmd+/ (no shift): show help
      if (key === '/' && !e.shiftKey) {
        run('show-help', e)
        return
      }

      // Cmd+1..6: focus tabs
      if (!e.shiftKey && key >= '1' && key <= '6') {
        run(`focus-tab-${key}`, e)
        return
      }

      if (e.shiftKey) {
        switch (key) {
          case '[':
            run('prev-tab', e)
            return
          case ']':
            run('next-tab', e)
            return
          case 'p':
            run('command-palette', e)
            return
          case 'f':
            run('focus-search', e)
            return
          case 'n':
            run('focus-paper-search', e)
            return
          case 'g':
            run('focus-graph', e)
            return
          case 'c':
            run('focus-chat', e)
            return
          case 'e':
            run('export-workspace', e)
            return
        }
        return
      }

      // No-shift Cmd combos
      switch (key) {
        case 'd':
          run('download-pdf', e)
          return
      }
    },
  }
}
