<script lang="ts">
  import { onMount } from 'svelte'
  import { workspace, hasWorkspace, initializeWorkspace } from './lib/stores/workspace'
  import { papers } from './lib/stores/papers'
  import { loadPapers } from './lib/services/papers'
  import WelcomeScreen from './lib/components/WelcomeScreen.svelte'
  import MainLayout from './lib/components/layout/MainLayout.svelte'

  let isLoading = $state(true)

  onMount(async () => {
    await initializeWorkspace()

    // Load existing papers from workspace on startup
    if ($workspace) {
      try {
        const loaded = await loadPapers($workspace.path)
        papers.set(loaded)
      } catch (error) {
        console.error('Failed to load papers:', error)
      }
    }

    isLoading = false
  })
</script>

{#if isLoading}
  <div class="loading">
    <div class="loading-spinner"></div>
  </div>
{:else if $hasWorkspace}
  <MainLayout />
{:else}
  <WelcomeScreen />
{/if}

<style>
  :global(*) {
    box-sizing: border-box;
  }

  :global(body) {
    margin: 0;
    padding: 0;
    font-family:
      -apple-system,
      BlinkMacSystemFont,
      'Segoe UI',
      'Roboto',
      'Oxygen',
      'Ubuntu',
      'Cantarell',
      'Fira Sans',
      'Droid Sans',
      'Helvetica Neue',
      sans-serif;
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
    background: var(--color-bg, #0f0f0f);
    color: var(--color-text, #f0f0f0);

    /* CSS custom properties for theming */
    --color-bg: #0f0f0f;
    --color-surface: #1a1a1a;
    --color-border: #2a2a2a;
    --color-text: #f0f0f0;
    --color-text-secondary: #aaaaaa;
    --color-text-muted: #666666;
    --color-accent: #6b9cff;
    --color-accent-hover: #5580e8;
    --color-error: #ff6b6b;
  }

  :global(html) {
    height: 100%;
  }

  .loading {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 100vw;
    height: 100vh;
    background: var(--color-bg, #0f0f0f);
  }

  .loading-spinner {
    width: 32px;
    height: 32px;
    border: 3px solid rgba(107, 156, 255, 0.2);
    border-top-color: var(--color-accent, #6b9cff);
    border-radius: 50%;
    animation: spin 0.7s linear infinite;
  }

  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }
</style>
