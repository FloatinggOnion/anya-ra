<script lang="ts">
  import Icon from '../Icon.svelte'
  import BrandMark from '../BrandMark.svelte'
  import { workspace } from '../../stores/workspace'
  import FullTextSearch from '../FullTextSearch.svelte'
  import ThemeToggle from '../ThemeToggle.svelte'
  import { createEventDispatcher } from 'svelte'

  const dispatch = createEventDispatcher()
</script>

<header class="toolbar">
  <div class="left">
    <BrandMark size={28} />
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
      <Icon name="settings" size={16} /> Settings
    </button>
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
    font-family: var(--font-display);
    font-size: 1.5rem;
    font-weight: 400;
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

  .settings-button {
    gap: 6px;
    background: none;
    border: none;
    cursor: pointer;
    font-size: var(--text-sm);
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
