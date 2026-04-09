<script lang="ts">
  import { documents } from '../../stores/documents'
  import { workspace } from '../../stores/workspace'
  import { showToast } from '../../services/toast'
  import { saveDocument } from '../../stores/documents'
  import { generateDocumentId } from '../../services/documents-io'

  interface Props {
    open: boolean
    templatePreselect?: string | null
    onClose: () => void
    onSubmit: (event: CustomEvent<{ docId: string; title: string; content: string }>) => void
  }

  let { open, templatePreselect = null, onClose, onSubmit } = $props()

  let title = $state('')
  let selectedTemplate = $state<'blank' | 'literature-review' | 'research-summary' | 'reading-notes'>(
    'blank'
  )

  let titleInput: HTMLInputElement | undefined = $state()

  // Focus title input when dialog opens
  $effect(() => {
    if (open && titleInput) {
      setTimeout(() => titleInput?.focus(), 0)
    }
    if (open && templatePreselect) {
      selectedTemplate = (templatePreselect as any) || 'blank'
    }
  })

  function getTemplateContent(template: string, title: string): string {
    const today = new Date().toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })

    switch (template) {
      case 'literature-review':
        return `# ${title}

## Introduction

## Summary

`
      case 'research-summary':
        return `# ${title}

## Summary

`
      case 'reading-notes':
        return `# ${title}

Created: ${today}

`
      case 'blank':
      default:
        return ''
    }
  }

  async function handleSubmit() {
    if (!title.trim()) {
      showToast('Title is required', 'error')
      return
    }

    if (!$workspace) {
      showToast('Workspace not available', 'error')
      return
    }

    try {
      const docId = await generateDocumentId($workspace.path)
      const content = getTemplateContent(selectedTemplate, title)

      // Save to store and disk
      await saveDocument($workspace.path, docId, title, content)

      // Notify parent
      const event = new CustomEvent('submit', {
        detail: { docId, title, content },
      })
      onSubmit(event)

      // Reset form
      title = ''
      selectedTemplate = 'blank'
      onClose()
    } catch (error) {
      console.error('Failed to create document:', error)
      showToast('Failed to create document', 'error')
    }
  }

  function handleCancel() {
    title = ''
    selectedTemplate = 'blank'
    onClose()
  }

  function handleKeydown(e: KeyboardEvent) {
    if (e.key === 'Enter') {
      e.preventDefault()
      handleSubmit()
    } else if (e.key === 'Escape') {
      e.preventDefault()
      handleCancel()
    }
  }
</script>

{#if open}
  <div class="modal-overlay" onclick={handleCancel} role="presentation">
    <div class="modal" onclick={(e) => e.stopPropagation()} role="dialog" aria-labelledby="dialog-title">
      <div class="modal-header">
        <h2 class="modal-title" id="dialog-title">New Document</h2>
      </div>

      <div class="modal-body">
        <!-- Title input -->
        <div class="form-group">
          <label for="doc-title" class="label">Title</label>
          <input
            id="doc-title"
            bind:this={titleInput}
            bind:value={title}
            type="text"
            placeholder="Enter document title..."
            onkeydown={handleKeydown}
            class="input"
          />
        </div>

        <!-- Template selection -->
        <div class="form-group">
          <label class="label">Template</label>
          <div class="template-options">
            <label class="radio-option">
              <input
                type="radio"
                bind:group={selectedTemplate}
                value="blank"
                name="template"
              />
              <span class="radio-label">Blank</span>
            </label>
            <label class="radio-option">
              <input
                type="radio"
                bind:group={selectedTemplate}
                value="literature-review"
                name="template"
              />
              <span class="radio-label">Literature Review</span>
            </label>
            <label class="radio-option">
              <input
                type="radio"
                bind:group={selectedTemplate}
                value="research-summary"
                name="template"
              />
              <span class="radio-label">Research Summary</span>
            </label>
            <label class="radio-option">
              <input
                type="radio"
                bind:group={selectedTemplate}
                value="reading-notes"
                name="template"
              />
              <span class="radio-label">Reading Notes</span>
            </label>
          </div>
        </div>
      </div>

      <div class="modal-actions">
        <button class="btn btn-secondary" onclick={handleCancel}>
          Cancel
        </button>
        <button class="btn btn-primary" onclick={handleSubmit} disabled={!title.trim()}>
          Create
        </button>
      </div>
    </div>
  </div>
{/if}

<style>
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
    max-width: 450px;
    width: 90%;
  }

  .modal-header {
    padding: 1.25rem;
    border-bottom: 1px solid var(--color-border);
  }

  .modal-title {
    margin: 0;
    font-size: 1.125rem;
    font-weight: 600;
    color: var(--color-text);
  }

  .modal-body {
    padding: 1.25rem;
  }

  .form-group {
    margin-bottom: 1.5rem;
  }

  .form-group:last-of-type {
    margin-bottom: 0;
  }

  .label {
    display: block;
    margin-bottom: 0.5rem;
    font-size: 0.875rem;
    font-weight: 500;
    color: var(--color-text);
  }

  .input {
    width: 100%;
    padding: 0.625rem 0.75rem;
    background: var(--color-bg);
    border: 1px solid var(--color-border);
    border-radius: 4px;
    color: var(--color-text);
    font-size: 0.875rem;
    box-sizing: border-box;
    transition: border-color 0.15s;
  }

  .input::placeholder {
    color: var(--color-text-muted);
  }

  .input:focus {
    outline: none;
    border-color: var(--color-accent);
  }

  .template-options {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }

  .radio-option {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    cursor: pointer;
    user-select: none;
  }

  .radio-option input[type='radio'] {
    cursor: pointer;
    accent-color: var(--color-accent);
  }

  .radio-label {
    font-size: 0.875rem;
    color: var(--color-text-secondary);
  }

  .radio-option:hover .radio-label {
    color: var(--color-text);
  }

  .modal-actions {
    display: flex;
    gap: 0.75rem;
    padding: 1.25rem;
    border-top: 1px solid var(--color-border);
    justify-content: flex-end;
  }

  .btn {
    padding: 0.625rem 1.25rem;
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

  .btn-primary {
    background: var(--color-accent);
    color: var(--color-text);
  }

  .btn-primary:hover:not(:disabled) {
    background: rgba(107, 156, 255, 0.8);
  }

  .btn-primary:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
</style>
