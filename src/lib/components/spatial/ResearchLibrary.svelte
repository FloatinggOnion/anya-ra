<script lang="ts">
  import SearchBar from '../SearchBar.svelte'
  import DocumentsSidebar from '../document/DocumentsSidebar.svelte'
  import { filteredPapers, selectedPaperId, showDownloadedOnly } from '../../stores/papers'
  import { documents, selectedDocumentId } from '../../stores/documents'
  import { addPaperToGraph, addCanvasNode, graphNodes } from '../../stores/graph'
  import { openCanvasObject, focusTool } from '../../stores/spatial'
  import { showToast } from '../../services/toast'
  import type { Paper } from '../../types/paper'
  let { initialQuery = '' }: { initialQuery?: string } = $props()
  let section = $state<'papers' | 'documents'>('papers')
  const selectedDocument = $derived($documents.get($selectedDocumentId ?? ''))
  async function pinPaper(paper: Paper) {
    try { await addPaperToGraph(paper) } catch { showToast('Could not add the paper notes to the canvas.', 'error') }
  }
  function openDocument(id: string, title: string) {
    const nodeId = addCanvasNode({ kind: 'document', documentId: id, title })
    selectedDocumentId.set(id); openCanvasObject(nodeId)
  }
</script>

<div class="library">
  <div class="heading"><h2>Research library</h2><p>Bring evidence into your thinking space.</p></div>
  <div class="switch" role="group" aria-label="Library content"><button class:active={section === 'papers'} onclick={() => section = 'papers'}>Papers</button><button class:active={section === 'documents'} onclick={() => section = 'documents'}>Documents</button></div>
  {#if section === 'papers'}
    <SearchBar {initialQuery} />
    <label class="download-filter"><input type="checkbox" bind:checked={$showDownloadedOnly} /> Downloaded only</label>
    <div class="items">
      {#each $filteredPapers as paper (paper.id)}
        <article>
          <button class="item-title" onclick={() => { selectedPaperId.set(paper.id); focusTool.set('papers') }}>{paper.title}</button>
          <small>{paper.authors.slice(0, 2).join(', ')}{paper.year ? ` · ${paper.year}` : ''}</small>
          <button class="pin" onclick={() => pinPaper(paper)} disabled={$graphNodes.some(n => n.data.kind === 'paper' && n.data.paperId === paper.id)}>{$graphNodes.some(n => n.data.kind === 'paper' && n.data.paperId === paper.id) ? 'On canvas' : '+ Add to canvas'}</button>
        </article>
      {:else}<p class="empty">Search arXiv or Semantic Scholar, or import a PDF to bring in your first source.</p>{/each}
    </div>
  {:else}
    <DocumentsSidebar />
    {#if selectedDocument}<div class="document-tools"><button onclick={() => openDocument(selectedDocument!.id, selectedDocument!.title)}>+ Add selected document to canvas</button></div>{/if}
  {/if}
</div>


<style>
  .library { height: 100%; display: flex; flex-direction: column; min-height: 0; background: var(--color-surface); }
  .heading { padding: 24px 20px 16px; } h2 { font: 400 24px/1.2 var(--font-display); margin: 0 0 8px; } p { font-size: var(--text-sm); line-height: 1.7; color: var(--color-text-secondary); margin: 0; }
  .switch { display: flex; gap: 8px; padding: 0 20px 16px; border-bottom: 1px solid var(--color-border); }
  button { background: transparent; border: 1px solid var(--color-border); color: var(--color-text-secondary); padding: 7px 10px; border-radius: var(--radius-input); font-size: var(--text-sm); cursor: pointer; text-align: left; }
  button:hover { background: var(--color-surface-2); } .switch .active { background: var(--color-accent-subtle); color: var(--color-accent); border-color: var(--color-accent); }
  .items { flex: 1; overflow: auto; padding: 0 20px; } article { padding: 20px 0; border-bottom: 1px solid var(--color-border); }
  .item-title { font: 400 18px/1.45 var(--font-display); padding: 0; border: 0; color: var(--color-text); display: block; width: 100%; }
  small { display: block; font-size: var(--text-xs); line-height: 1.6; color: var(--color-text-muted); margin: 8px 0; }
  .pin { font-size: var(--text-xs); } .empty { padding: 24px 0; }
  .download-filter { display: flex; align-items: center; gap: 8px; padding: 8px 20px; color: var(--color-text-secondary); font-size: var(--text-xs); }
  .document-tools { padding: 16px 20px; display: grid; gap: 8px; }
</style>
