<script lang="ts">
  import { workspace } from '../stores/workspace'
  import { pickFolder, createWorkspace } from '../services/workspace'

  let isSelecting = $state(false)
  let errorMessage = $state('')

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
      errorMessage = error instanceof Error ? error.message : 'Failed to select folder'
      console.error('Workspace selection error:', error)
    } finally {
      isSelecting = false
    }
  }
</script>

<div class="welcome-screen">
  <div class="content">
    <div class="logo">
      <h1>Anya<span class="accent">-RA</span></h1>
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
        Open Workspace Folder
      {/if}
    </button>

    {#if errorMessage}
      <p class="error">{errorMessage}</p>
    {/if}

    <p class="hint">Choose a folder where your research files will be stored.</p>
  </div>
</div>

<style>
  .welcome-screen {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 100%;
    height: 100vh;
    background: var(--color-bg, #0f0f0f);
  }

  .content {
    text-align: center;
    max-width: 480px;
    padding: 2.5rem;
  }

  .logo h1 {
    font-size: 3.5rem;
    font-weight: 800;
    margin: 0 0 0.25rem 0;
    color: var(--color-text, #f0f0f0);
    letter-spacing: -0.02em;
  }

  .accent {
    color: var(--color-accent, #6b9cff);
  }

  .tagline {
    font-size: 1rem;
    font-weight: 500;
    letter-spacing: 0.15em;
    text-transform: uppercase;
    color: var(--color-text-muted, #888888);
    margin: 0 0 1.5rem 0;
  }

  .description {
    font-size: 1.0625rem;
    color: var(--color-text-secondary, #aaaaaa);
    margin: 0 0 2.5rem 0;
    line-height: 1.7;
  }

  .primary-button {
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;
    background: var(--color-accent, #6b9cff);
    color: #ffffff;
    border: none;
    padding: 0.875rem 2rem;
    font-size: 1rem;
    font-weight: 600;
    border-radius: 6px;
    cursor: pointer;
    transition: background 0.15s ease, transform 0.1s ease;
    min-width: 220px;
    justify-content: center;
  }

  .primary-button:hover:not(:disabled) {
    background: var(--color-accent-hover, #5580e8);
    transform: translateY(-1px);
  }

  .primary-button:active:not(:disabled) {
    transform: translateY(0);
  }

  .primary-button:disabled {
    background: var(--color-text-muted, #555555);
    cursor: not-allowed;
    transform: none;
  }

  .spinner {
    display: inline-block;
    width: 14px;
    height: 14px;
    border: 2px solid rgba(255, 255, 255, 0.3);
    border-top-color: #ffffff;
    border-radius: 50%;
    animation: spin 0.7s linear infinite;
  }

  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }

  .hint {
    margin-top: 1.25rem;
    font-size: 0.8125rem;
    color: var(--color-text-muted, #666666);
    line-height: 1.5;
  }

  .error {
    color: var(--color-error, #ff6b6b);
    font-size: 0.875rem;
    margin-top: 1rem;
    padding: 0.5rem 1rem;
    background: rgba(255, 107, 107, 0.1);
    border-radius: 4px;
    border-left: 3px solid var(--color-error, #ff6b6b);
  }
</style>
