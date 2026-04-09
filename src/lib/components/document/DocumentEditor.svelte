<script lang="ts">
  import { documents, selectedDocumentId, currentDocument, documentLinks, updateLinks, saveDocumentWithLinks } from '../../stores/documents'
  import { papers } from '../../stores/papers'
  import NotesEditor from '../editor/NotesEditor.svelte'
  import { workspace } from '../../stores/workspace'
  import { onMount } from 'svelte'
  import { validateAndGetLinks } from '../../services/document-validation'

  let NotesEditorComponent: any = $state(null)
  let content = $state('')
  let currentLinks: any[] = $state([])
  let validationTimeout: ReturnType<typeof setTimeout> | null = null

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
      // Restore links from documentLinks store
      const storedLinks = $documentLinks.get(doc.id) ?? []
      currentLinks = storedLinks
      // Re-validate to update decorations (in case papers list changed)
      runValidation(content, $papers)
    } else {
      content = ''
      currentLinks = []
    }
  })

  /**
   * Run validation with 100ms debounce.
   * Parse citations, validate against papers store.
   * Store links in memory but don't persist yet (will persist on auto-save).
   */
  function runValidation(newContent: string, papersList: any[]) {
    // Clear pending validation
    if (validationTimeout) clearTimeout(validationTimeout)

    // Debounce validation to ~100ms
    validationTimeout = setTimeout(() => {
      const { links, suggestions } = validateAndGetLinks(newContent, papersList)
      currentLinks = links

      // Update documentLinks store (in-memory only, not persisted yet)
      if ($selectedDocumentId) {
        updateLinks($selectedDocumentId, links)
      }

      console.log(`[DocumentEditor] Validated ${links.length} citations (${links.filter(l => l.status === 'valid').length} valid, ${links.filter(l => l.status === 'missing').length} missing)`)
    }, 100)
  }

  // Trigger validation on content change
  $effect(() => {
    runValidation(content, $papers)
  })

  // Trigger validation when papers store changes (new papers added, etc.)
  $effect(() => {
    const _ = $papers  // Depend on papers list
    runValidation(content, $papers)
  })

  function handleChange(newContent: string) {
    content = newContent
  }

  /**
   * Handle auto-save: persist both content and links to disk.
   * Called from NotesEditor on blur or manual save (Cmd+S).
   */
  async function handleAutoSave(newContent: string) {
    const ws = $workspace
    const docId = $selectedDocumentId
    const doc = $currentDocument

    if (!ws || !docId || !doc) return

    try {
      // Save with links
      await saveDocumentWithLinks(
        ws.path,
        docId,
        doc.title,
        newContent,
        currentLinks,
        doc.createdAt
      )
      console.log(`[DocumentEditor] Auto-saved ${docId} with ${currentLinks.length} links`)
    } catch (error) {
      console.error(`[DocumentEditor] Auto-save failed for ${docId}:`, error)
    }
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
        <!-- svelte-ignore svelte_component_deprecated -->
        <svelte:component
          this={NotesEditorComponent}
          type="document"
          id={$selectedDocumentId}
          title={$currentDocument.title}
          bind:content
          onChange={handleChange}
          onBlur={() => handleAutoSave(content)}
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
