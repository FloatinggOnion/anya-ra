<script lang="ts">
  import { documents, selectedDocumentId, currentDocument } from '../../stores/documents'
  import NotesEditor from '../editor/NotesEditor.svelte'
  import { onMount } from 'svelte'

  let NotesEditorComponent: any = $state(null)
  let content = $state('')

  // Load editor component on mount
  onMount(async () => {
    try {
      const mod = await import('../editor/NotesEditor.svelte')
      NotesEditorComponent = mod.default
    } catch (err) {
      console.error('Failed to load NotesEditor:', err)
    }
  })

  // Update content when selected document changes
  $effect(() => {
    const doc = $currentDocument
    if (doc) {
      content = doc.content
    } else {
      content = ''
    }
  })

  function handleChange(newContent: string) {
    content = newContent
  }
</script>

<div class="document-editor">
  {#if !$selectedDocumentId}
    <div class="empty-state">
      <div class="empty-icon">📄</div>
      <h2>No document selected</h2>
      <p>Select a document from the sidebar to open it in the editor.</p>
    </div>
  {:else if !$currentDocument}
    <div class="loading-state">
      <p>Loading document...</p>
    </div>
  {:else}
    <div class="editor-wrapper">
      {#if NotesEditorComponent}
        <svelte:component
          this={NotesEditorComponent}
          type="document"
          id={$selectedDocumentId}
          title={$currentDocument.title}
          bind:content
          onChange={handleChange}
        />
      {:else}
        <div class="loading-placeholder">
          <p>Loading editor...</p>
        </div>
      {/if}
    </div>
  {/if}
</div>

<style>
  .document-editor {
    display: flex;
    flex-direction: column;
    height: 100%;
    width: 100%;
    background: var(--color-surface-0);
    overflow: hidden;
  }

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
    color: var(--color-text);
    margin: 0 0 0.4rem 0;
  }

  .empty-state p {
    font-size: 0.9rem;
    color: var(--color-text-secondary);
    line-height: 1.55;
    margin: 0;
  }

  .loading-state {
    display: flex;
    align-items: center;
    justify-content: center;
    height: 100%;
    color: var(--color-text-secondary);
    font-size: 14px;
  }

  .editor-wrapper {
    flex: 1;
    overflow: hidden;
    display: flex;
    flex-direction: column;
    border-radius: 4px;
  }

  .loading-placeholder {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 100%;
    height: 100%;
    color: var(--color-text-secondary);
  }

  .loading-placeholder p {
    margin: 0;
    font-size: 14px;
  }
</style>
