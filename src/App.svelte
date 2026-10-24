<script lang="ts">
  import { onMount } from 'svelte'
  import type { Workspace } from './lib/types/workspace'
  import { workspace, hasWorkspace, initializeWorkspace } from './lib/stores/workspace'
  import { papers, selectedPaperId, searchQuery } from './lib/stores/papers'
  import { notes } from './lib/stores/notes'
  import { documents, documentLinks, selectedDocumentId } from './lib/stores/documents'
  import { graphNodes, graphEdges } from './lib/stores/graph'
  import { clearChat } from './lib/stores/chat'
  import { clearContext } from './lib/stores/context-selection'
  import { researchGoal, researchProposals, acceptedProposals } from './lib/stores/spatial'
  import { loadSettings } from './lib/stores/settings'
  import { providerState } from './lib/stores/llm-provider'
  import { loadPapers } from './lib/services/papers'
  import { initializeNotes } from './lib/services/notes-io'
  import { initializeDocuments } from './lib/stores/documents'
  import { initializeGraph } from './lib/stores/graph'
  import { initializeTheme } from './lib/stores/theme'
  import WelcomeScreen from './lib/components/WelcomeScreen.svelte'
  import MainLayout from './lib/components/layout/MainLayout.svelte'
  import Toast from './lib/components/Toast.svelte'
  import SettingsDialog from './lib/components/settings/SettingsDialog.svelte'

  let isLoading = $state(true)
  let settingsDialog: SettingsDialog

  let loadError = $state('')
  async function loadWorkspaceContents(ws: Workspace) {
    isLoading = true
    loadError = ''
    try {
      await loadSettings(ws.path)
      papers.set(await loadPapers(ws.path))
      await initializeNotes(ws.path)
      await initializeDocuments(ws.path)
      await initializeGraph()
    } catch (error) {
      loadError = error instanceof Error ? error.message : 'The workspace could not be loaded.'
    } finally {
      isLoading = false
    }
  }
  let isStarting = $state(true)
  onMount(() => {
    let unsubscribe = () => {}
    let disposed = false
    async function start() {
      await initializeTheme()
      await initializeWorkspace()
      if (disposed) return
      unsubscribe = workspace.subscribe(ws => {
        papers.set([]); notes.set(new Map()); documents.set(new Map()); documentLinks.set(new Map())
        graphNodes.set([]); graphEdges.set([]); selectedPaperId.set(null); selectedDocumentId.set(null)
        searchQuery.set(''); clearChat(); clearContext()
        researchGoal.set(''); researchProposals.set([]); acceptedProposals.set({})
        if (!ws) {
          providerState.set({ type: 'ollama', provider: null, apiKey: null, error: null })
          isLoading = false
          return
        }
        void loadWorkspaceContents(ws)
      })
      isStarting = false
    }
    void start()
    return () => { disposed = true; unsubscribe() }
  })

</script>

{#if isStarting || isLoading}
  <div class="loading">
    <div class="loading-spinner"></div>
  </div>
{:else if loadError && $hasWorkspace}
  <div class="workspace-error" role="alert">
    <h1>Could not open this workspace.</h1><p>{loadError}</p>
    <button onclick={() => $workspace && loadWorkspaceContents($workspace)}>Try again</button>
    <button onclick={() => workspace.set(null)}>Choose another workspace</button>
  </div>
{:else if $hasWorkspace}
  <MainLayout on:open-settings={() => settingsDialog?.open()} />
{:else}
  <WelcomeScreen />
{/if}

<SettingsDialog bind:this={settingsDialog} />
<Toast />

<style>
  .workspace-error { max-width: 560px; margin: 20vh auto; padding: 24px; }
  .workspace-error h1 { font: 400 32px/1.3 var(--font-display); }
  .workspace-error p { color: var(--color-text-secondary); }
  .workspace-error button { color: var(--color-text); background: var(--color-surface); border: 1px solid var(--color-border); padding: 10px 14px; border-radius: var(--radius-input); margin: 8px 8px 0 0; cursor: pointer; }

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
    font-family: var(--font-body);
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
