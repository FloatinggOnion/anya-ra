<script lang="ts">
  import { onMount } from 'svelte'
  import { workspace, hasWorkspace, initializeWorkspace } from './lib/stores/workspace'
  import { papers } from './lib/stores/papers'
  import { loadPapers } from './lib/services/papers'
  import { initializeNotes } from './lib/services/notes-io'
  import { initializeGraph } from './lib/stores/graph'
  import { initializeTheme } from './lib/stores/theme'
  import WelcomeScreen from './lib/components/WelcomeScreen.svelte'
  import MainLayout from './lib/components/layout/MainLayout.svelte'
  import Toast from './lib/components/Toast.svelte'

  let isLoading = $state(true)

  onMount(async () => {
    // Initialize theme first (before other UI)
    await initializeTheme()

    await initializeWorkspace()

    // Load existing papers from workspace on startup
    if ($workspace) {
      try {
        const loaded = await loadPapers($workspace.path)
        papers.set(loaded)
      } catch (error) {
        console.error('Failed to load papers:', error)
      }

      // Initialize notes after papers are loaded
      try {
        await initializeNotes($workspace.path)
      } catch (error) {
        console.error('Failed to initialize notes:', error)
      }

      // Initialize graph AFTER papers — orphan filtering requires live paper list
      try {
        await initializeGraph()
      } catch (error) {
        console.error('Failed to load graph:', error)
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

<Toast />

<style>
  /* ── Design Tokens ──────────────────────────────────────────────── */
  :global(:root) {
    /* Dark mode (default) — near-black with subtle warmth */
    --color-bg: #0a0a0b;
    --color-surface: #111113;
    --color-surface-2: #18181c;
    --color-surface-3: #1f1f25;

    /* Borders — very subtle */
    --color-border: #ffffff0f;
    --color-border-strong: #ffffff1a;

    /* Text */
    --color-text: #f2f2f7;
    --color-text-secondary: #aeaeb2;
    --color-text-muted: #636366;

    /* Accent — electric indigo/violet */
    --color-accent: #7c6af7;
    --color-accent-hover: #9b8df9;
    --color-accent-subtle: #7c6af71a;

    /* Semantic */
    --color-error: #ff453a;
    --color-success: #30d158;
    --color-warning: #ffd60a;

    /* Hover */
    --color-hover-bg: rgba(255, 255, 255, 0.1);
    --color-primary: #0a84ff;
  }

  /* Light mode */
  :global(html.light) {
    --color-bg: #ffffff;
    --color-surface: #f5f5f7;
    --color-surface-2: #ebebf0;
    --color-surface-3: #e5e5ea;

    --color-border: #0000000f;
    --color-border-strong: #0000001a;

    --color-text: #000000;
    --color-text-secondary: #515154;
    --color-text-muted: #999a9d;

    --color-accent: #7c6af7;
    --color-accent-hover: #9b8df9;
    --color-accent-subtle: #7c6af71a;

    --color-error: #ff453a;
    --color-success: #30d158;
    --color-warning: #d2a200;

    --color-hover-bg: rgba(0, 0, 0, 0.06);
    --color-primary: #0a84ff;
  }

  /* ── Reset & Base ───────────────────────────────────────────────── */
  :global(*) {
    box-sizing: border-box;
  }

  :global(html) {
    height: 100%;
  }

  :global(body) {
    margin: 0;
    padding: 0;
    font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    font-size: 14px;
    line-height: 1.6;
    color: var(--color-text);
    background: var(--color-bg);
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
    height: 100%;
  }

  /* ── Scrollbars ─────────────────────────────────────────────────── */
  :global(::-webkit-scrollbar) { width: 6px; height: 6px; }
  :global(::-webkit-scrollbar-track) { background: transparent; }
  :global(::-webkit-scrollbar-thumb) {
    background: var(--color-border-strong);
    border-radius: 3px;
  }
  :global(::-webkit-scrollbar-thumb:hover) { background: var(--color-text-muted); }

  /* ── Selection ──────────────────────────────────────────────────── */
  :global(::selection) {
    background: var(--color-accent-subtle);
    color: var(--color-text);
  }

  /* ── Loading screen ─────────────────────────────────────────────── */
  .loading {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 100vw;
    height: 100vh;
    background: var(--color-bg);
  }

  .loading-spinner {
    width: 28px;
    height: 28px;
    border: 2px solid var(--color-accent-subtle);
    border-top-color: var(--color-accent);
    border-radius: 50%;
    animation: spin 0.7s linear infinite;
  }

  @keyframes spin {
    to { transform: rotate(360deg); }
  }
</style>
