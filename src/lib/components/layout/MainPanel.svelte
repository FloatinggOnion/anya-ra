<script lang="ts">
  import PaperDetail from '../PaperDetail.svelte'
  import ChatWindow from '../chat/ChatWindow.svelte'
  import GraphCanvas from '../graph/GraphCanvas.svelte'
  import NotesPanel from '../editor/NotesPanel.svelte'
  import { selectedPaper } from '../../stores/papers'
  import { workspace } from '../../stores/workspace'
  import { join } from '@tauri-apps/api/path'

  // Tab navigation: 'chat', 'papers', 'pdf', 'notes', or 'graph'
  let activeTab = $state<'chat' | 'papers' | 'pdf' | 'notes' | 'graph'>('chat')

  // Computed absolute PDF path for the selected paper
  let resolvedPdfPath = $state<string | null>(null)

  // Lazy-loaded components
  let PDFViewerComponent: any = $state(null)
  let GraphCanvasComponent: any = $state(null)

  $effect(() => {
    const paper = $selectedPaper
    const ws = $workspace
    if (paper?.localPdfPath && ws?.path) {
      // Build absolute path from workspace + relative PDF path
      join(ws.path, paper.localPdfPath).then((p) => {
        resolvedPdfPath = p
        if (activeTab !== 'pdf') activeTab = 'pdf'
      })
    } else {
      resolvedPdfPath = null
      if (activeTab === 'pdf') activeTab = 'papers'
    }
  })

  // Lazy-load PDFViewer component when PDF tab is active
  $effect(() => {
    if (activeTab === 'pdf' && !PDFViewerComponent) {
      import('../pdf/PDFViewer.svelte').then((mod) => {
        PDFViewerComponent = mod.default
      })
    }
  })

  // Lazy-load GraphCanvas component when graph tab is active
  $effect(() => {
    if (activeTab === 'graph' && !GraphCanvasComponent) {
      import('../graph/GraphCanvas.svelte').then((mod) => {
        GraphCanvasComponent = mod.default
      })
    }
  })
</script>

<div class="main-panel">
  <div class="tab-bar">
    <button
      class="tab-btn"
      class:active={activeTab === 'chat'}
      onclick={() => (activeTab = 'chat')}
    >
      💬 Chat
    </button>
    <button
      class="tab-btn"
      class:active={activeTab === 'papers'}
      onclick={() => (activeTab = 'papers')}
    >
      📄 Papers
    </button>
    {#if resolvedPdfPath && $selectedPaper}
      <button
        class="tab-btn"
        class:active={activeTab === 'pdf'}
        onclick={() => (activeTab = 'pdf')}
      >
        📖 PDF
      </button>
    {/if}
    <!-- Notes tab — conditional on paper selection -->
    {#if $selectedPaper}
      <button
        class="tab-btn"
        class:active={activeTab === 'notes'}
        onclick={() => (activeTab = 'notes')}
      >
        📝 Notes
      </button>
    {/if}
    <button
      class="tab-btn"
      class:active={activeTab === 'graph'}
      onclick={() => (activeTab = 'graph')}
    >
      🕸 Graph
    </button>
  </div>

  <div class="tab-content">
    {#if activeTab === 'chat'}
      <ChatWindow />
    {:else if activeTab === 'papers'}
      {#if $selectedPaper}
        <PaperDetail />
      {:else}
        <div class="empty-state">
          <div class="icon">📄</div>
          <h2>Ready to research</h2>
          <p>Search for papers or import a PDF to get started.</p>
        </div>
      {/if}
    {:else if activeTab === 'pdf' && resolvedPdfPath && $selectedPaper}
      {#if PDFViewerComponent}
        <svelte:component this={PDFViewerComponent} pdfPath={resolvedPdfPath} paperId={$selectedPaper.id} />
      {:else}
        <div class="loading-placeholder">
          <p>Loading PDF viewer...</p>
        </div>
      {/if}
    {:else if activeTab === 'notes' && $selectedPaper}
      <NotesPanel paper={$selectedPaper} />
    {:else if activeTab === 'graph'}
      {#if GraphCanvasComponent}
        <svelte:component this={GraphCanvasComponent} />
      {:else}
        <div class="loading-placeholder">
          <p>Loading graph canvas...</p>
        </div>
      {/if}
    {/if}
  </div>
</div>

<style>
  .main-panel {
    display: flex;
    flex-direction: column;
    width: 100%;
    height: 100%;
    background: var(--color-bg, #0f0f0f);
    overflow: hidden;
  }

  .tab-bar {
    display: flex;
    border-bottom: 1px solid var(--color-border, #2a2a2a);
    background: var(--color-surface, #1a1a1a);
    flex-shrink: 0;
  }

  .tab-btn {
    padding: 10px 20px;
    background: none;
    border: none;
    color: var(--color-text-secondary, #aaaaaa);
    cursor: pointer;
    font-size: 13px;
    font-weight: 500;
    border-bottom: 2px solid transparent;
    transition: color 0.15s, border-color 0.15s;
  }

  .tab-btn:hover {
    color: var(--color-text, #f0f0f0);
  }

  .tab-btn.active {
    color: var(--color-accent, #6b9cff);
    border-bottom-color: var(--color-accent, #6b9cff);
  }

  .tab-content {
    flex: 1;
    overflow: hidden;
    display: flex;
    flex-direction: column;
  }

  .tab-content :global(.paper-detail) {
    width: 100%;
  }

  .empty-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    width: 100%;
    height: 100%;
    text-align: center;
    max-width: 400px;
    padding: 2rem;
    margin: auto;
  }

  .icon {
    font-size: 3rem;
    margin-bottom: 1rem;
    opacity: 0.5;
  }

  .empty-state h2 {
    font-size: 1.375rem;
    font-weight: 600;
    color: var(--color-text, #f0f0f0);
    margin: 0 0 0.5rem 0;
  }

  .empty-state p {
    font-size: 0.9375rem;
    color: var(--color-text-secondary, #aaaaaa);
    line-height: 1.6;
    margin: 0;
  }

  .loading-placeholder {
    display: flex;
    align-items: center;
    justify-content: center;
    height: 100%;
    color: var(--color-text-secondary, #aaaaaa);
  }

  .loading-placeholder p {
    margin: 0;
    font-size: 14px;
  }
</style>
