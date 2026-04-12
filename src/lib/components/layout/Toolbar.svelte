<script lang="ts">
  import { workspace } from '../../stores/workspace'
  import FullTextSearch from '../FullTextSearch.svelte'
  import ThemeToggle from '../ThemeToggle.svelte'
  import { createEventDispatcher } from 'svelte'

  const dispatch = createEventDispatcher()
</script>

<header class="toolbar">
  <div class="left">
    <span class="app-name">Anya</span>
    {#if $workspace}
      <span class="separator">›</span>
      <span class="workspace-name">{$workspace.name}</span>
    {/if}
  </div>
  <div class="right">
    <FullTextSearch />
    <ThemeToggle />
    <button
      class="settings-button"
      title="Settings"
      onclick={() => dispatch('open-settings')}
      aria-label="Open settings"
    >
      ⚙️
    </button>
    <span class="phase-badge">Phase 9</span>
  </div>
</header>

<style>
  .toolbar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    height: 48px;
    padding: 0 1rem;
    border-bottom: 1px solid var(--color-border);
    background: var(--color-surface);
    flex-shrink: 0;
    user-select: none;
  }

  .left {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .app-name {
    font-size: 0.9375rem;
    font-weight: 700;
    color: var(--color-text);
    letter-spacing: -0.02em;
  }

  .separator {
    color: var(--color-text-muted);
    font-size: 0.875rem;
    opacity: 0.5;
  }

  .workspace-name {
    font-size: 0.875rem;
    font-weight: 500;
    color: var(--color-text-secondary);
    max-width: 300px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .right {
    display: flex;
    align-items: center;
    gap: 1rem;
  }

  .phase-badge {
    font-size: 0.6875rem;
    font-weight: 600;
    color: var(--color-text-muted);
    background: var(--color-surface-2);
    border: 1px solid var(--color-border);
    border-radius: 4px;
    padding: 0.1875rem 0.5rem;
    letter-spacing: 0.06em;
    text-transform: uppercase;
  }

  .settings-button {
    background: none;
    border: none;
    cursor: pointer;
    font-size: 1.1rem;
    padding: 0.25rem;
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--color-text-muted);
    transition: color 0.2s ease;
  }

  .settings-button:hover {
    color: var(--color-text);
  }

  .settings-button:active {
    opacity: 0.7;
  }
</style>
