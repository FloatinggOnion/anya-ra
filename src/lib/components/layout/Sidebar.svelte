<script lang="ts">
  import { workspace } from '../../stores/workspace'
  import { showDownloadedOnly } from '../../stores/papers'
  import SearchBar from '../SearchBar.svelte'
  import PaperList from '../PaperList.svelte'
  import DocumentsSidebar from '../document/DocumentsSidebar.svelte'

  function switchWorkspace() {
    workspace.set(null)
  }
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
    <div class="filter-controls">
      <label class="filter-toggle">
        <input
          type="checkbox"
          bind:checked={$showDownloadedOnly}
        />
        <span>📥 Downloaded Only</span>
      </label>
    </div>
    <PaperList />
    <div class="divider"></div>
    <DocumentsSidebar />
    <div class="sidebar-footer">
      <button class="switch-btn" onclick={switchWorkspace} title="Switch workspace">
        ⇄ Switch Workspace
      </button>
    </div>
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

  .sidebar-footer {
    flex-shrink: 0;
    padding: 0.5rem 0.75rem;
    border-top: 1px solid var(--color-border, #2a2a2a);
    margin-top: auto;
  }

  .switch-btn {
    width: 100%;
    padding: 0.4375rem 0.75rem;
    background: transparent;
    border: 1px solid var(--color-border, #2a2a2a);
    border-radius: 4px;
    color: var(--color-text-muted);
    font-size: 0.75rem;
    font-weight: 500;
    cursor: pointer;
    text-align: center;
    transition: background 0.15s, color 0.15s, border-color 0.15s;
  }

  .switch-btn:hover {
    background: rgba(255, 255, 255, 0.04);
    color: var(--color-text);
    border-color: var(--color-accent);
  }

  .filter-controls {
    padding: 8px 12px;
    border-bottom: 1px solid var(--color-border, #2a2a2a);
    flex-shrink: 0;
  }

  .filter-toggle {
    display: flex;
    align-items: center;
    gap: 8px;
    cursor: pointer;
    font-size: 12px;
    color: var(--color-text-secondary);
    user-select: none;
    transition: color 0.15s;
  }

  .filter-toggle:hover {
    color: var(--color-text);
  }

  .filter-toggle input {
    width: 16px;
    height: 16px;
    cursor: pointer;
    accent-color: var(--color-accent);
  }

  .filter-toggle span {
    flex: 1;
  }
</style>
