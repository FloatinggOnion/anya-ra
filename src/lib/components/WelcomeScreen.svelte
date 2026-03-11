<script lang="ts">
  import { onMount } from 'svelte'
  import { workspace } from '../stores/workspace'
  import { pickFolder, createWorkspace, getRecentWorkspaces, addToRecentWorkspaces } from '../services/workspace'
  import type { Workspace } from '../types/workspace'

  let isSelecting = $state(false)
  let errorMessage = $state('')
  let recentWorkspaces = $state<Workspace[]>([])

  onMount(async () => {
    recentWorkspaces = await getRecentWorkspaces()
  })

  async function selectWorkspaceFolder() {
    isSelecting = true
    errorMessage = ''

    try {
      const path = await pickFolder()

      if (path) {
        const ws = await createWorkspace(path)
        workspace.set(ws)
      }
    } catch (error) {
      errorMessage = error instanceof Error ? error.message : String(error)
      console.error('Workspace selection error:', error)
    } finally {
      isSelecting = false
    }
  }

  async function openRecent(recent: Workspace) {
    try {
      const updated = { ...recent, lastOpened: new Date().toISOString() }
      await addToRecentWorkspaces(updated)
      workspace.set(updated)
    } catch (error) {
      errorMessage = error instanceof Error ? error.message : String(error)
    }
  }

  function formatDate(iso: string): string {
    try {
      return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
    } catch {
      return iso
    }
  }

  function truncatePath(path: string, maxLen = 48): string {
    if (path.length <= maxLen) return path
    return '…' + path.slice(path.length - maxLen + 1)
  }
</script>

<div class="welcome-screen">
  <div class="content">
    <div class="logo">
      <h1>Anya</h1>
    </div>
    <p class="tagline">Research Assistant</p>
    <p class="description">
      Your integrated workspace for papers, annotations, and writing.
    </p>

    <button
      class="primary-button"
      onclick={selectWorkspaceFolder}
      disabled={isSelecting}
    >
      {#if isSelecting}
        <span class="spinner"></span>
        Opening…
      {:else}
        {#if recentWorkspaces.length > 0}Open Other Folder…{:else}Open Workspace Folder{/if}
      {/if}
    </button>

    {#if errorMessage}
      <p class="error">{errorMessage}</p>
    {/if}

    {#if recentWorkspaces.length > 0}
      <div class="recents">
        <p class="recents-label">Recent</p>
        {#each recentWorkspaces as recent}
          <button class="recent-item" onclick={() => openRecent(recent)}>
            <span class="recent-name">{recent.name}</span>
            <span class="recent-path">{truncatePath(recent.path)}</span>
            <span class="recent-date">{formatDate(recent.lastOpened)}</span>
          </button>
        {/each}
      </div>
    {:else}
      <p class="hint">Choose a folder where your research files will be stored.</p>
    {/if}
  </div>
</div>

<style>
  .welcome-screen {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 100%;
    height: 100vh;
    background: var(--color-bg);
  }

  .content {
    text-align: center;
    max-width: 480px;
    padding: 3rem 2.5rem;
  }

  .logo h1 {
    font-size: 4rem;
    font-weight: 800;
    margin: 0 0 0.5rem 0;
    letter-spacing: -0.04em;
    background: linear-gradient(135deg, var(--color-text) 30%, var(--color-accent) 100%);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
    /* Subtle glow behind the text */
    filter: drop-shadow(0 0 24px var(--color-accent-subtle));
  }

  .tagline {
    font-size: 0.75rem;
    font-weight: 500;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    color: var(--color-text-muted);
    margin: 0 0 1.75rem 0;
  }

  .description {
    font-size: 1rem;
    color: var(--color-text-secondary);
    margin: 0 0 2.5rem 0;
    line-height: 1.7;
  }

  .primary-button {
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;
    background: var(--color-accent);
    color: #ffffff;
    border: none;
    padding: 0.875rem 2rem;
    font-size: 0.9375rem;
    font-weight: 600;
    border-radius: 8px;
    cursor: pointer;
    transition: background 0.15s ease, transform 0.1s ease, box-shadow 0.15s ease;
    min-width: 220px;
    justify-content: center;
    box-shadow: 0 0 20px var(--color-accent-subtle);
    letter-spacing: -0.01em;
  }

  .primary-button:hover:not(:disabled) {
    background: var(--color-accent-hover);
    transform: translateY(-1px);
    box-shadow: 0 0 32px var(--color-accent-subtle), 0 4px 16px rgba(124, 106, 247, 0.25);
  }

  .primary-button:active:not(:disabled) {
    transform: translateY(0);
    box-shadow: 0 0 12px var(--color-accent-subtle);
  }

  .primary-button:disabled {
    background: var(--color-surface-3);
    color: var(--color-text-muted);
    cursor: not-allowed;
    transform: none;
    box-shadow: none;
  }

  .spinner {
    display: inline-block;
    width: 14px;
    height: 14px;
    border: 2px solid rgba(255, 255, 255, 0.25);
    border-top-color: #ffffff;
    border-radius: 50%;
    animation: spin 0.7s linear infinite;
  }

  @keyframes spin {
    to { transform: rotate(360deg); }
  }

  .hint {
    margin-top: 1.25rem;
    font-size: 0.8125rem;
    color: var(--color-text-muted);
    line-height: 1.5;
  }

  .error {
    color: var(--color-error);
    font-size: 0.875rem;
    margin-top: 1rem;
    padding: 0.5rem 1rem;
    background: rgba(255, 69, 58, 0.08);
    border-radius: 6px;
    border-left: 2px solid var(--color-error);
  }

  .recents {
    margin-top: 2rem;
    text-align: left;
    width: 100%;
  }

  .recents-label {
    font-size: 0.6875rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: var(--color-text-muted, #666666);
    margin: 0 0 0.5rem 0;
  }

  .recent-item {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    width: 100%;
    padding: 0.625rem 0.875rem;
    margin-bottom: 0.25rem;
    background: var(--color-surface, #1a1a1a);
    border: 1px solid var(--color-border, #2a2a2a);
    border-radius: 6px;
    cursor: pointer;
    text-align: left;
    transition: background 0.15s, border-color 0.15s;
    gap: 0.125rem;
  }

  .recent-item:hover {
    background: var(--color-surface-2, #222222);
    border-color: var(--color-accent, #6b9cff);
  }

  .recent-name {
    font-size: 0.875rem;
    font-weight: 600;
    color: var(--color-text, #f0f0f0);
  }

  .recent-path {
    font-size: 0.6875rem;
    font-family: monospace;
    color: var(--color-text-muted, #666666);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    max-width: 100%;
  }

  .recent-date {
    font-size: 0.6875rem;
    color: var(--color-text-muted, #555555);
  }
</style>
