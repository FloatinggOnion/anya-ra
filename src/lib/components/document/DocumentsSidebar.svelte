<script lang="ts">
  import { documents, selectedDocumentId, updateDocumentMetadata } from '../../stores/documents'
  import { workspace } from '../../stores/workspace'
  import { showToast } from '../../services/toast'
  import DocumentCreateDialog from './DocumentCreateDialog.svelte'
  import type { Document } from '../../types/document'

  let searchQuery = $state('')
  let showCreateDialog = $state(false)
  let selectedTemplateOnOpen = $state<string | null>(null)
  let editingDocId = $state<string | null>(null)
  let editingTitle = $state('')
  let deleteConfirmDocId = $state<string | null>(null)

  // Filtered list based on search
  const filteredDocuments = $derived.by(() => {
    const allDocs = Array.from($documents.values())
    if (!searchQuery.trim()) {
      return allDocs.sort((a, b) => a.title.localeCompare(b.title))
    }
    const query = searchQuery.toLowerCase()
    return allDocs
      .filter(doc => doc.title.toLowerCase().includes(query))
      .sort((a, b) => a.title.localeCompare(b.title))
  })

  function handleCreateClick(template?: string) {
    selectedTemplateOnOpen = template || null
    showCreateDialog = true
  }

  function handleDialogSubmit(event: CustomEvent<{ docId: string; title: string; content: string }>) {
    showCreateDialog = false
    selectedTemplateOnOpen = null
    // The dialog will have already called saveDocument, so the document will appear in the list
  }

  function handleDocumentClick(docId: string) {
    selectedDocumentId.set(docId)
    showCreateDialog = false
  }

  async function handleRenameStart(doc: Document) {
    editingDocId = doc.id
    editingTitle = doc.title
  }

  async function handleRenameSave(docId: string) {
    if (!editingTitle.trim()) {
      editingDocId = null
      return
    }

    if (!$workspace) {
      showToast('Workspace not available', 'error')
      editingDocId = null
      return
    }

    try {
      await updateDocumentMetadata($workspace.path, docId, editingTitle)
      editingDocId = null
    } catch (error) {
      console.error('Failed to rename document:', error)
      showToast('Failed to rename document', 'error')
      editingDocId = null
    }
  }

  function handleRenameKeydown(e: KeyboardEvent, docId: string) {
    if (e.key === 'Enter') {
      handleRenameSave(docId)
    } else if (e.key === 'Escape') {
      editingDocId = null
    }
  }

  function handleRenameBlur(docId: string) {
    handleRenameSave(docId)
  }

  function handleDeleteClick(docId: string) {
    deleteConfirmDocId = docId
  }

  async function handleDeleteConfirm() {
    if (!deleteConfirmDocId || !$workspace) return

    try {
      // Import the delete function from documents-io service
      const { deleteDocument } = await import('../../services/documents-io')
      await deleteDocument($workspace.path, deleteConfirmDocId)

      // Update store
      documents.update(map => {
        map.delete(deleteConfirmDocId)
        return map
      })

      // Clear selection if the deleted document was selected
      if ($selectedDocumentId === deleteConfirmDocId) {
        selectedDocumentId.set(null)
      }

      deleteConfirmDocId = null
      showToast('Document deleted', 'success')
    } catch (error) {
      console.error('Failed to delete document:', error)
      showToast('Failed to delete document', 'error')
      deleteConfirmDocId = null
    }
  }

  function handleDeleteCancel() {
    deleteConfirmDocId = null
  }
</script>

<div class="documents-section">
  <!-- Header -->
  <div class="section-header">
    <h3 class="section-title">📝 Documents</h3>
  </div>

  {#if filteredDocuments.length === 0 && searchQuery === ''}
    <!-- Empty state with template suggestions -->
    <div class="empty-state">
      <p class="empty-text">Start your first literature review.</p>
      <p class="empty-subtext">Choose a structure or create blank:</p>

      <div class="template-buttons">
        <button
          class="template-btn"
          onclick={() => handleCreateClick('literature-review')}
          title="Create a new Literature Review document"
        >
          📋 Literature Review
        </button>
        <button
          class="template-btn"
          onclick={() => handleCreateClick('research-summary')}
          title="Create a new Research Summary document"
        >
          📝 Research Summary
        </button>
        <button
          class="template-btn"
          onclick={() => handleCreateClick('reading-notes')}
          title="Create a new Reading Notes document"
        >
          📚 Reading Notes
        </button>
        <button
          class="template-btn"
          onclick={() => handleCreateClick('blank')}
          title="Create a blank document"
        >
          ➕ Blank Document
        </button>
      </div>
    </div>
  {:else}
    <!-- Search input -->
    <div class="search-wrapper">
      <input
        type="text"
        bind:value={searchQuery}
        placeholder="Search documents..."
        aria-label="Search documents by title"
        class="search-input"
      />
    </div>

    <!-- No results message -->
    {#if filteredDocuments.length === 0 && searchQuery !== ''}
      <div class="no-results">
        <p>No documents matching "{searchQuery}"</p>
      </div>
    {/if}

    <!-- Document list -->
    {#if filteredDocuments.length > 0}
      <div class="document-list">
        {#each filteredDocuments as doc (doc.id)}
          <div
            class="document-item"
            class:selected={doc.id === $selectedDocumentId}
            onclick={() => handleDocumentClick(doc.id)}
            onkeydown={(e) => e.key === 'Enter' && handleDocumentClick(doc.id)}
            role="button"
            tabindex="0"
          >
            <div class="document-content">
              {#if editingDocId === doc.id}
                <!-- Inline edit field -->
                <input
                  type="text"
                  bind:value={editingTitle}
                  onblur={() => handleRenameBlur(doc.id)}
                  onkeydown={(e) => handleRenameKeydown(e, doc.id)}
                  class="inline-edit"
                  placeholder="Document title"
                  onclick={(e) => e.stopPropagation()}
                  autofocus={true}
                />
              {:else}
                <span class="document-title">{doc.title}</span>
              {/if}
            </div>

            <!-- Hover actions -->
            {#if !editingDocId}
              <div class="document-actions">
                <button
                  class="action-btn rename-btn"
                  onclick={(e) => {
                    e.stopPropagation()
                    handleRenameStart(doc)
                  }}
                  title="Rename document"
                  aria-label="Rename document"
                >
                  ✏️
                </button>
                <button
                  class="action-btn delete-btn"
                  onclick={(e) => {
                    e.stopPropagation()
                    handleDeleteClick(doc.id)
                  }}
                  title="Delete document"
                  aria-label="Delete document"
                >
                  🗑️
                </button>
              </div>
            {/if}
          </div>
        {/each}
      </div>
    {/if}

    <!-- New document button -->
    <button class="new-document-btn" onclick={() => handleCreateClick()}>
      ➕ New Document
    </button>
  {/if}

  <!-- Create dialog -->
  {#if showCreateDialog}
    <DocumentCreateDialog
      open={showCreateDialog}
      templatePreselect={selectedTemplateOnOpen}
      onClose={() => {
        showCreateDialog = false
        selectedTemplateOnOpen = null
      }}
      onSubmit={handleDialogSubmit}
    />
  {/if}

  <!-- Delete confirmation dialog -->
  {#if deleteConfirmDocId}
    <!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
    <div class="modal-overlay" onclick={handleDeleteCancel} role="presentation">
      <!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
      <div class="modal" onclick={(e) => e.stopPropagation()} role="dialog">
        <div class="modal-header">
          <h3 class="modal-title">Delete document?</h3>
        </div>
        <div class="modal-body">
          <p>This action cannot be undone.</p>
        </div>
        <div class="modal-actions">
          <button class="btn btn-secondary" onclick={handleDeleteCancel}>
            Cancel
          </button>
          <button class="btn btn-danger" onclick={handleDeleteConfirm}>
            Delete
          </button>
        </div>
      </div>
    </div>
  {/if}
</div>

<style>
  .documents-section {
    display: flex;
    flex-direction: column;
    flex: 1;
    min-height: 0;
    padding: 0.75rem 0.875rem;
    background: var(--color-surface);
  }

  .section-header {
    flex-shrink: 0;
    margin-bottom: 0.75rem;
  }

  .section-title {
    font-size: 0.625rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.1em;
    color: var(--color-text-muted);
    margin: 0;
  }

  /* Empty state */
  .empty-state {
    display: flex;
    flex-direction: column;
    gap: 1rem;
    padding: 1.5rem 0;
    text-align: center;
  }

  .empty-text {
    font-size: 0.8125rem;
    color: var(--color-text);
    margin: 0;
    font-weight: 500;
  }

  .empty-subtext {
    font-size: 0.75rem;
    color: var(--color-text-muted);
    margin: 0;
  }

  .template-buttons {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .template-btn {
    padding: 0.5rem 0.75rem;
    background: transparent;
    border: 1px solid var(--color-border);
    border-radius: 4px;
    color: var(--color-text-secondary);
    font-size: 0.75rem;
    cursor: pointer;
    text-align: left;
    transition: background 0.15s, color 0.15s, border-color 0.15s;
  }

  .template-btn:hover {
    background: rgba(255, 255, 255, 0.04);
    color: var(--color-text);
    border-color: var(--color-accent);
  }

  /* Search */
  .search-wrapper {
    margin-bottom: 0.5rem;
    flex-shrink: 0;
  }

  .search-input {
    width: 100%;
    padding: 0.375rem 0.5rem;
    background: var(--color-bg);
    border: 1px solid var(--color-border);
    border-radius: 4px;
    color: var(--color-text);
    font-size: 0.8125rem;
    box-sizing: border-box;
    transition: border-color 0.15s;
  }

  .search-input::placeholder {
    color: var(--color-text-muted);
  }

  .search-input:focus {
    outline: none;
    border-color: var(--color-accent);
  }

  /* Document list */
  .document-list {
    flex: 1;
    overflow-y: auto;
    overflow-x: hidden;
    min-height: 0;
    margin-bottom: 0.5rem;

    scrollbar-width: thin;
    scrollbar-color: var(--color-border) transparent;
  }

  .document-list::-webkit-scrollbar {
    width: 4px;
  }

  .document-list::-webkit-scrollbar-thumb {
    background: var(--color-border);
    border-radius: 2px;
  }

  /* Document item */
  .document-item {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0.5rem 0.5rem;
    margin-bottom: 0.25rem;
    background: transparent;
    border-radius: 4px;
    cursor: pointer;
    transition: background 0.15s;
  }

  .document-item:hover {
    background: var(--color-hover, rgba(255, 255, 255, 0.04));
  }

  .document-item.selected {
    background: var(--color-surface-2);
    border-left: 2px solid var(--color-accent);
    padding-left: calc(0.5rem - 2px);
  }

  .document-content {
    flex: 1;
    min-width: 0;
  }

  .document-title {
    font-size: 0.8125rem;
    color: var(--color-text);
    display: block;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  /* Inline edit */
  .inline-edit {
    width: 100%;
    padding: 0.25rem 0.375rem;
    background: var(--color-bg);
    border: 1px solid var(--color-accent);
    border-radius: 2px;
    color: var(--color-text);
    font-size: 0.8125rem;
    box-sizing: border-box;
  }

  .inline-edit:focus {
    outline: none;
    border-color: var(--color-accent);
  }

  /* Actions */
  .document-actions {
    display: flex;
    gap: 0.25rem;
    flex-shrink: 0;
    opacity: 0;
    transition: opacity 0.15s;
  }

  .document-item:hover .document-actions {
    opacity: 1;
  }

  .action-btn {
    padding: 0.25rem 0.375rem;
    background: transparent;
    border: none;
    color: var(--color-text-muted);
    font-size: 0.75rem;
    cursor: pointer;
    border-radius: 2px;
    transition: background 0.15s, color 0.15s;
  }

  .action-btn:hover {
    background: var(--color-surface-2);
    color: var(--color-text);
  }

  /* New document button */
  .new-document-btn {
    width: 100%;
    padding: 0.5rem 0.75rem;
    background: transparent;
    border: 1px solid var(--color-border);
    border-radius: 4px;
    color: var(--color-text-secondary);
    font-size: 0.75rem;
    font-weight: 500;
    cursor: pointer;
    flex-shrink: 0;
    transition: background 0.15s, color 0.15s, border-color 0.15s;
  }

  .new-document-btn:hover {
    background: rgba(255, 255, 255, 0.04);
    color: var(--color-text);
    border-color: var(--color-accent);
  }

  /* No results */
  .no-results {
    padding: 1rem;
    text-align: center;
    color: var(--color-text-muted);
    font-size: 0.8125rem;
  }

  /* Modal */
  .modal-overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.5);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
  }

  .modal {
    background: var(--color-surface-1);
    border: 1px solid var(--color-border);
    border-radius: 8px;
    box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.3);
    max-width: 400px;
    width: 90%;
  }

  .modal-header {
    padding: 1rem;
    border-bottom: 1px solid var(--color-border);
  }

  .modal-title {
    margin: 0;
    font-size: 1rem;
    font-weight: 600;
    color: var(--color-text);
  }

  .modal-body {
    padding: 1rem;
  }

  .modal-body p {
    margin: 0;
    font-size: 0.875rem;
    color: var(--color-text-secondary);
    line-height: 1.5;
  }

  .modal-actions {
    display: flex;
    gap: 0.5rem;
    padding: 1rem;
    border-top: 1px solid var(--color-border);
    justify-content: flex-end;
  }

  .btn {
    padding: 0.5rem 1rem;
    border-radius: 4px;
    font-size: 0.875rem;
    font-weight: 500;
    cursor: pointer;
    border: none;
    transition: background 0.15s, color 0.15s;
  }

  .btn-secondary {
    background: transparent;
    border: 1px solid var(--color-border);
    color: var(--color-text-secondary);
  }

  .btn-secondary:hover {
    background: var(--color-hover);
    color: var(--color-text);
  }

  .btn-danger {
    background: rgba(239, 68, 68, 0.1);
    color: #f87171;
    border: 1px solid rgba(239, 68, 68, 0.3);
  }

  .btn-danger:hover {
    background: rgba(239, 68, 68, 0.2);
  }
</style>
