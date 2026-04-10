<script lang="ts">
  import { selectedDocumentId, currentDocument, documentLinks, updateLinks, saveDocumentWithLinks } from '../../stores/documents'
  import { papers } from '../../stores/papers'
  import NotesEditor from '../editor/NotesEditor.svelte'
  import { workspace } from '../../stores/workspace'
  import { validateAndGetLinks } from '../../services/document-validation'

  let content = $state('')
  let currentLinks: any[] = $state([])
  let validationTimeout: ReturnType<typeof setTimeout> | null = null
  let autoSaveTimeout: ReturnType<typeof setTimeout> | null = null
  let lastLoadedContent = ''
  // Plain (non-reactive) variable — tracks which doc ID has been loaded into the editor.
  // Used to distinguish "switching documents" from "store updated after auto-save".
  let loadedDocId: string | null = null

  // Load document content only when the selected document ID changes.
  //
  // MUST be $effect.pre() — runs BEFORE DOM update, which means `content` is
  // set to the correct value before NotesEditor/CodeMirror mounts. Without this,
  // the sequence is:
  //   1. DOM updates → NotesEditor mounts with content=''
  //   2. CodeMirror initializes with '' → first_update consumed on that empty call
  //   3. $effect fires → content = doc.content → CodeMirror.$effect fires update()
  //   4. first_update is ALREADY FALSE → would work... but see below
  //
  // With $effect.pre():
  //   1. content = doc.content (before DOM update)
  //   2. DOM update → NotesEditor mounts with content=doc.content
  //   3. CodeMirror initializes with doc.content → correct from the start ✓
  //
  // The loadedDocId guard prevents auto-save (which updates store object's updatedAt)
  // from re-triggering a content reload and causing cursor resets / flicker.
  $effect.pre(() => {
    const docId = $selectedDocumentId
    const doc = $currentDocument  // Subscribe so we re-run if doc loads asynchronously

    if (docId !== loadedDocId) {
      if (doc) {
        // New document available — load it
        loadedDocId = docId
        lastLoadedContent = doc.content
        content = doc.content
        currentLinks = $documentLinks.get(doc.id) ?? []
      } else if (!docId) {
        // Nothing selected
        loadedDocId = null
        lastLoadedContent = ''
        content = ''
        currentLinks = []
      }
      // If docId is set but doc is still null (async load), wait —
      // the effect re-runs when $currentDocument becomes available
    }
  })

  // Auto-save on keystroke via $bindable propagation.
  // Skips saves when content matches what was loaded from disk (document switch).
  $effect(() => {
    const newContent = content
    if (newContent === lastLoadedContent) return
    if (!$selectedDocumentId || !$currentDocument) return

    if (autoSaveTimeout) clearTimeout(autoSaveTimeout)
    autoSaveTimeout = setTimeout(() => {
      handleAutoSave(newContent)
    }, 300)
  })

  // Validate citations with 100ms debounce
  $effect(() => {
    const newContent = content
    const papersList = $papers
    if (validationTimeout) clearTimeout(validationTimeout)
    validationTimeout = setTimeout(() => {
      const { links } = validateAndGetLinks(newContent, papersList)
      currentLinks = links
      if ($selectedDocumentId) {
        updateLinks($selectedDocumentId, links)
      }
    }, 100)
  })

  async function handleAutoSave(newContent: string) {
    const ws = $workspace
    const docId = $selectedDocumentId
    const doc = $currentDocument
    if (!ws || !docId || !doc) return

    try {
      await saveDocumentWithLinks(ws.path, docId, doc.title, newContent, currentLinks, doc.createdAt)
      lastLoadedContent = newContent
      console.log(`[DocumentEditor] Saved ${docId}`)
    } catch (err) {
      console.error(`[DocumentEditor] Save failed:`, err)
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
      <NotesEditor
        type="document"
        id={$selectedDocumentId}
        title={$currentDocument.title}
        bind:content
        onChange={() => {}}
        onBlur={() => handleAutoSave(content)}
      />
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
</style>
