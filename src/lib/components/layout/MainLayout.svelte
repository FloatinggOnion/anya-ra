<script lang="ts">
  import { onMount } from 'svelte'
  import Toolbar from './Toolbar.svelte'
  import Sidebar from './Sidebar.svelte'
  import MainPanel from './MainPanel.svelte'
  import KeyboardShortcutsPanel from '../KeyboardShortcutsPanel.svelte'
  import { createKeyboardHandlers } from '../../services/keyboard-handler'

  let showShortcuts = $state(false)

  onMount(() => {
    const handlers = createKeyboardHandlers(() => {
      showShortcuts = !showShortcuts
    })

    function handleKeydown(e: KeyboardEvent) {
      // Esc: Close shortcuts
      if (e.key === 'Escape' && showShortcuts) {
        showShortcuts = false
        e.preventDefault()
        return
      }

      // Delegate to keyboard handler
      handlers.handleKeydown(e)
    }

    window.addEventListener('keydown', handleKeydown)
    return () => window.removeEventListener('keydown', handleKeydown)
  })
</script>

<div class="main-layout">
  <Toolbar />
  <div class="content-area">
    <aside class="sidebar-container">
      <Sidebar />
    </aside>
    <main class="main-panel-container">
      <MainPanel />
    </main>
  </div>
</div>

<KeyboardShortcutsPanel bind:isOpen={showShortcuts} />

<style>
  .main-layout {
    display: grid;
    grid-template-rows: 48px 1fr;
    width: 100%;
    height: 100vh;
    overflow: hidden;
    background: var(--color-bg);
  }

  .content-area {
    display: grid;
    grid-template-columns: 260px 1fr;
    overflow: hidden;
  }

  .sidebar-container {
    border-right: 1px solid var(--color-border);
    overflow: hidden;
  }

  .main-panel-container {
    overflow: hidden;
  }
</style>
