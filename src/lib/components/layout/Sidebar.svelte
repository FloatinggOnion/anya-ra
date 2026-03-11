<script lang="ts">
  import { workspace } from '../../stores/workspace'
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
  {/if}

  <div class="section">
    <h3 class="section-title">Papers</h3>
    <p class="empty-state">No papers yet</p>
  </div>

  <div class="section">
    <h3 class="section-title">Notes</h3>
    <p class="empty-state">No notes yet</p>
  </div>

  <div class="section">
    <h3 class="section-title">Graph</h3>
    <p class="empty-state">No connections yet</p>
  </div>
</nav>

<style>
  .sidebar {
    display: flex;
    flex-direction: column;
    padding: 0.75rem 0;
    background: var(--color-surface, #1a1a1a);
    height: 100%;
    overflow-y: auto;
  }

  .workspace-header {
    display: flex;
    align-items: flex-start;
    gap: 0.625rem;
    padding: 0.5rem 1rem 0.875rem;
  }

  .workspace-icon {
    font-size: 1.25rem;
    flex-shrink: 0;
    margin-top: 1px;
  }

  .workspace-info {
    min-width: 0;
    flex: 1;
  }

  .workspace-name {
    font-size: 0.875rem;
    font-weight: 600;
    color: var(--color-text, #f0f0f0);
    margin: 0 0 0.125rem 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .workspace-path {
    font-size: 0.6875rem;
    color: var(--color-text-muted, #666666);
    margin: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    font-family: monospace;
  }

  .divider {
    height: 1px;
    background: var(--color-border, #2a2a2a);
    margin: 0 0 0.5rem 0;
  }

  .section {
    padding: 0.5rem 1rem;
    margin-bottom: 0.25rem;
  }

  .section-title {
    font-size: 0.6875rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: var(--color-text-muted, #666666);
    margin: 0 0 0.5rem 0;
  }

  .empty-state {
    font-size: 0.8125rem;
    color: var(--color-text-muted, #555555);
    font-style: italic;
    margin: 0;
    padding: 0.25rem 0;
  }
</style>
