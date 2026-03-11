<script lang="ts">
  import Toolbar from './Toolbar.svelte'
  import Sidebar from './Sidebar.svelte'
  import MainPanel from './MainPanel.svelte'
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

<style>
  .main-layout {
    display: grid;
    grid-template-rows: 48px 1fr;
    width: 100%;
    height: 100vh;
    overflow: hidden;
    background: var(--color-bg, #0f0f0f);
  }

  .content-area {
    display: grid;
    grid-template-columns: 280px 1fr;
    overflow: hidden;
  }

  .sidebar-container {
    border-right: 1px solid var(--color-border, #2a2a2a);
    overflow: hidden;
  }

  .main-panel-container {
    overflow: hidden;
  }
</style>
