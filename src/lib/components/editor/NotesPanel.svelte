<script lang="ts">
  import Icon from '../Icon.svelte'
  import { workspace } from '../../stores/workspace'
  import { currentPaperNote, saveNote } from '../../stores/notes'
  import { ensureNoteNodeForPaper, deleteNoteNodeForPaper } from '../../stores/graph'
  import { showToast } from '../../services/toast'
  import ExportDialog from './ExportDialog.svelte'
  import type { Paper } from '../../types/paper'
  import { onMount, onDestroy } from 'svelte'
  import { get } from 'svelte/store'
  import { persistGraph, graphViewport } from '../../stores/graph'

  interface Props {
    paper: Paper
  }

  let { paper } = $props()

  const workspacePath = get(workspace)?.path
  let content = $state('')
  let isSaving = $state(false)
  let showExportDialog = $state(false)
  let pendingSave: ReturnType<typeof setTimeout> | null = null
  let NotesEditorComponent: any = $state(null)

  $effect(() => {
    if (paper && $currentPaperNote?.notes[0]) {
      content = $currentPaperNote.notes[0].content
    } else {
      content = ''
    }
  })

  onMount(async () => {
    try {
      const mod = await import('./NotesEditor.svelte')
      NotesEditorComponent = mod.default
    } catch (err) {
      console.error('Failed to load NotesEditor:', err)
      showToast('Failed to load notes editor', 'error')
    }
  })

  function debouncedSave(newContent: string) {
    content = newContent

    if (pendingSave) clearTimeout(pendingSave)

    isSaving = true
    pendingSave = setTimeout(async () => {
      if (!workspacePath) return

      try {
        await saveNote(workspacePath, paper.id, content)
        // Add/update note in graph
        if (content.trim()) {
          ensureNoteNodeForPaper(paper.id, content)
        } else {
          deleteNoteNodeForPaper(paper.id)
        }
        persistGraph(get(graphViewport))
        console.log(`[NotesPanel] Auto-saved for ${paper.id}`)
      } catch (error) {
        console.error('[NotesPanel] Save failed:', error)
        showToast('Failed to save note', 'error')
      } finally {
        isSaving = false
        pendingSave = null
      }
    }, 300)
  }

  async function handleEditorBlur() {
    if (pendingSave) {
      clearTimeout(pendingSave)
      pendingSave = null
    }

    if (workspacePath) {
      try {
        await saveNote(workspacePath, paper.id, content)
        // Add/update note in graph
        if (content.trim()) {
          ensureNoteNodeForPaper(paper.id, content)
        } else {
          deleteNoteNodeForPaper(paper.id)
        }
        persistGraph(get(graphViewport))
        console.log(`[NotesPanel] Blur-saved for ${paper.id}`)
      } catch (error) {
        console.error('[NotesPanel] Blur-save failed:', error)
        showToast('Failed to save note', 'error')
      }
    }
  }
  onDestroy(() => {
    if (pendingSave) void handleEditorBlur()
  })
</script>

<div class="notes-panel">
  <div class="notes-header">
    <h2 class="title"><Icon name="note" /> Notes: {paper.title || 'Untitled'}</h2>
    <div class="controls">
      <button
        class="export-btn"
        onclick={() => (showExportDialog = true)}
        disabled={!content}
      >
        <Icon name="download" /> Export
      </button>
      {#if isSaving}
        <span class="save-indicator">Saving...</span>
      {/if}
    </div>
  </div>

  <div class="editor-wrapper">
    {#if NotesEditorComponent}
      <svelte:component
        this={NotesEditorComponent}
        bind:content
        onChange={debouncedSave}
      />
    {:else}
      <div class="loading-placeholder">
        <p>Loading notes editor...</p>
      </div>
    {/if}
  </div>

  {#if showExportDialog}
    <ExportDialog
      {paper}
      {content}
      onClose={() => (showExportDialog = false)}
    />
  {/if}
</div>

<style>
  .notes-panel {
    display: flex;
    flex-direction: column;
    height: 100%;
    background: var(--color-surface-0);
    gap: 12px;
    padding: 12px;
  }

  .notes-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 8px 12px;
    background: var(--color-surface-1);
    border-radius: 4px;
    border-bottom: 1px solid var(--color-surface-2);
  }

  .title {
    margin: 0;
    font-size: 15px;
    font-weight: 600;
    color: var(--color-text);
    flex: 1;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .controls {
    display: flex;
    gap: 12px;
    align-items: center;
  }

  .export-btn {
    background: #313244;
    border: 1px solid #45475a;
    border-radius: 4px;
    padding: 6px 12px;
    font-size: 12px;
    color: #cdd6f4;
    cursor: pointer;
    transition: background 0.15s;
  }

  .export-btn:hover:not(:disabled) {
    background: #45475a;
  }

  .export-btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .save-indicator {
    font-size: 11px;
    color: #a6adc8;
    font-style: italic;
  }

  .editor-wrapper {
    flex: 1;
    overflow: hidden;
    display: flex;
    flex-direction: column;
    border-radius: 4px;
    border: 1px solid var(--color-surface-2);
  }

  .loading-placeholder {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 100%;
    height: 100%;
    color: var(--color-text-secondary, #aaaaaa);
  }

  .loading-placeholder p {
    margin: 0;
    font-size: 14px;
  }
</style>
