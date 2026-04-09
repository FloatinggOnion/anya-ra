<script lang="ts">
  import ChatWindow from '../chat/ChatWindow.svelte'
  import PaperDetail from '../PaperDetail.svelte'
  import NotesPanel from '../editor/NotesPanel.svelte'
  import { selectedPaper } from '../../stores/papers'
  import type { MovableTab } from '../../stores/panel-layout'

  interface Props {
    tab: MovableTab
    resolvedPdfPath: string | null
    PDFViewerComponent: any
    GraphCanvasComponent: any
  }

  let { tab, resolvedPdfPath, PDFViewerComponent, GraphCanvasComponent }: Props = $props()
</script>

{#if tab === 'chat'}
  <ChatWindow />
{:else if tab === 'papers'}
  {#if $selectedPaper}
    <PaperDetail />
  {:else}
    <div class="empty-state">
      <div class="empty-icon">📄</div>
      <h2>Ready to research</h2>
      <p>Search for papers or import a PDF to get started.</p>
    </div>
  {/if}
{:else if tab === 'pdf'}
  {#if resolvedPdfPath && $selectedPaper}
    {#if PDFViewerComponent}
      {#key `${$selectedPaper.id}:${resolvedPdfPath}`}
        <PDFViewerComponent pdfPath={resolvedPdfPath} paperId={$selectedPaper.id} />
      {/key}
    {:else}
      <div class="loading-placeholder"><p>Loading PDF viewer…</p></div>
    {/if}
  {:else}
    <div class="empty-state">
      <div class="empty-icon">📖</div>
      <h2>No PDF loaded</h2>
      <p>Select a paper that has a local PDF attached.</p>
    </div>
  {/if}
{:else if tab === 'notes'}
  {#if $selectedPaper}
    <NotesPanel paper={$selectedPaper} />
  {:else}
    <div class="empty-state">
      <div class="empty-icon">📝</div>
      <h2>No paper selected</h2>
      <p>Select a paper to open its notes.</p>
    </div>
  {/if}
{:else if tab === 'document'}
  {#await import('../document/DocumentEditor.svelte').then(m => m.default) then DocumentEditorComponent}
    <svelte:component this={DocumentEditorComponent} />
  {:catch error}
    <div class="empty-state">
      <div class="empty-icon">⚠️</div>
      <h2>Error loading document editor</h2>
      <p>Failed to load the document editor.</p>
    </div>
  {/await}
{:else if tab === 'graph'}
  {#if GraphCanvasComponent}
    <GraphCanvasComponent />
  {:else}
    <div class="loading-placeholder"><p>Loading graph canvas…</p></div>
  {/if}
{/if}

<style>
  .empty-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    width: 100%;
    height: 100%;
    text-align: center;
    max-width: 380px;
    padding: 2rem;
    margin: auto;
  }

  .empty-icon {
    font-size: 2.5rem;
    margin-bottom: 0.875rem;
    opacity: 0.45;
  }

  .empty-state h2 {
    font-size: 1.25rem;
    font-weight: 600;
    color: var(--color-text, #f0f0f0);
    margin: 0 0 0.4rem 0;
  }

  .empty-state p {
    font-size: 0.9rem;
    color: var(--color-text-secondary, #aaaaaa);
    line-height: 1.55;
    margin: 0;
  }

  .loading-placeholder {
    display: flex;
    align-items: center;
    justify-content: center;
    height: 100%;
    color: var(--color-text-secondary, #aaaaaa);
    font-size: 14px;
  }
</style>
