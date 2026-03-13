<script lang="ts">
  import { themePreference, saveThemePreference, effectiveTheme } from '../stores/theme'
  import type { Theme } from '../stores/theme'

  let showMenu = $state(false)

  function handleThemeChange(theme: Theme) {
    saveThemePreference(theme)
    showMenu = false
  }

  const themeNames: Record<Theme, string> = {
    light: '☀️ Light',
    dark: '🌙 Dark',
    auto: '🔄 Auto',
  }
</script>

<div class="theme-toggle">
  <button
    class="toggle-btn"
    onclick={() => (showMenu = !showMenu)}
    title="Toggle theme"
  >
    {#if $effectiveTheme === 'dark'}
      🌙
    {:else}
      ☀️
    {/if}
  </button>

  {#if showMenu}
    <div class="theme-menu">
      {#each ['light', 'dark', 'auto'] as theme}
        <button
          class="menu-item"
          class:active={$themePreference === theme}
          onclick={() => handleThemeChange(theme as Theme)}
        >
          {themeNames[theme as Theme]}
          {#if $themePreference === theme}
            ✓
          {/if}
        </button>
      {/each}
    </div>
  {/if}
</div>

<style>
  .theme-toggle {
    position: relative;
  }

  .toggle-btn {
    background: none;
    border: none;
    font-size: 1.2rem;
    cursor: pointer;
    padding: 4px 8px;
    border-radius: 4px;
    transition: background-color 0.2s;
  }

  .toggle-btn:hover {
    background-color: var(--color-hover-bg, rgba(255, 255, 255, 0.1));
  }

  .theme-menu {
    position: absolute;
    top: 100%;
    right: 0;
    background: var(--color-surface, #1a1a1a);
    border: 1px solid var(--color-border, #2a2a2a);
    border-radius: 4px;
    min-width: 120px;
    z-index: 100;
    margin-top: 4px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
  }

  .menu-item {
    display: flex;
    align-items: center;
    justify-content: space-between;
    width: 100%;
    padding: 8px 12px;
    background: none;
    border: none;
    color: var(--color-text, #fff);
    cursor: pointer;
    text-align: left;
    transition: background-color 0.15s;
  }

  .menu-item:hover {
    background-color: var(--color-hover-bg, rgba(255, 255, 255, 0.1));
  }

  .menu-item.active {
    color: var(--color-primary, #0a84ff);
    font-weight: 500;
  }
</style>
