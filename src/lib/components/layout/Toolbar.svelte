<script lang="ts">
  import { workspace } from '../../stores/workspace'
</script>

<header class="toolbar">
  <div class="left">
    <span class="app-name">Anya<span class="accent">-RA</span></span>
    {#if $workspace}
      <span class="separator">›</span>
      <span class="workspace-name">{$workspace.name}</span>
    {/if}
  </div>
  <div class="right">
    <span class="phase-badge">Phase 1</span>
  </div>
</header>

<style>
  .toolbar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    height: 48px;
    padding: 0 1rem;
    border-bottom: 1px solid var(--color-border, #2a2a2a);
    background: var(--color-surface, #1a1a1a);
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
    color: var(--color-text, #f0f0f0);
    letter-spacing: -0.01em;
  }

  .accent {
    color: var(--color-accent, #6b9cff);
  }

  .separator {
    color: var(--color-text-muted, #555555);
    font-size: 0.875rem;
  }

  .workspace-name {
    font-size: 0.875rem;
    font-weight: 500;
    color: var(--color-text-secondary, #aaaaaa);
    max-width: 300px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .right {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .phase-badge {
    font-size: 0.75rem;
    font-weight: 600;
    color: var(--color-text-muted, #666666);
    background: var(--color-bg, #0f0f0f);
    border: 1px solid var(--color-border, #2a2a2a);
    border-radius: 4px;
    padding: 0.1875rem 0.5rem;
    letter-spacing: 0.05em;
    text-transform: uppercase;
  }
</style>
