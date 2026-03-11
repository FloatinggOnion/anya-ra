<script lang="ts">
  import { workspace } from '../../stores/workspace'
  import SearchBar from '../SearchBar.svelte'
  import PaperList from '../PaperList.svelte'
</script>

<nav class="sidebar">
  {#if $workspace}
    <div class="workspace-header">
      <div class="workspace-icon">📁</div>
      <div class="workspace-info">
        <p class="workspace-name">{$workspace.name}</p>
        <p class="workspace-path">{$workspace.path}</p>
      </div>
    </div>
    <div class="divider"></div>
    <!-- Paper search & list -->
    <SearchBar />
    <PaperList />
  {:else}
    <div class="section">
      <p class="empty-state">No workspace open</p>
    </div>
  {/if}
</nav>

<style>
  .sidebar {
    display: flex;
    flex-direction: column;
    padding: 0;
    background: var(--color-surface);
    height: 100%;
    overflow: hidden;
  }

  .workspace-header {
    display: flex;
    align-items: flex-start;
    gap: 0.5rem;
    padding: 0.75rem 0.875rem;
    flex-shrink: 0;
  }

  .workspace-icon {
    font-size: 1.125rem;
    flex-shrink: 0;
    margin-top: 1px;
    opacity: 0.7;
  }

  .workspace-info {
    min-width: 0;
    flex: 1;
  }

  .workspace-name {
    font-size: 0.8125rem;
    font-weight: 600;
    color: var(--color-text);
    margin: 0 0 0.125rem 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .workspace-path {
    font-size: 0.6875rem;
    color: var(--color-text-muted);
    margin: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    font-family: monospace;
  }

  .divider {
    height: 1px;
    background: var(--color-border);
    margin: 0 0 0.5rem 0;
  }

  .section {
    padding: 0.5rem 0.875rem;
    margin-bottom: 0.25rem;
  }

  .section-title {
    font-size: 0.625rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.1em;
    color: var(--color-text-muted);
    margin: 0 0 0.5rem 0;
  }

  .empty-state {
    font-size: 0.8125rem;
    color: var(--color-text-muted);
    font-style: italic;
    margin: 0;
    padding: 0.25rem 0;
  }
</style>
