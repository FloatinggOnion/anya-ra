<script lang="ts">
  import { onMount } from 'svelte'
  import Toolbar from './Toolbar.svelte'
  import Sidebar from './Sidebar.svelte'
  import MainPanel from './MainPanel.svelte'
  import KeyboardShortcutsPanel from '../KeyboardShortcutsPanel.svelte'

  let showShortcuts = $state(false)

  onMount(() => {
    function handleKeydown(e: KeyboardEvent) {
      // Cmd/Ctrl + K: Open shortcuts
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        showShortcuts = true
      }
      // Esc: Close shortcuts
      if (e.key === 'Escape' && showShortcuts) {
        showShortcuts = false
      }
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
