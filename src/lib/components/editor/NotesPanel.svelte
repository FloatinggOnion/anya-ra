<script lang="ts">
  import { workspace } from '../../stores/workspace'
  import { currentPaperNote, saveNote } from '../../stores/notes'
  import NotesEditor from './NotesEditor.svelte'
  import ExportDialog from './ExportDialog.svelte'
  import type { Paper } from '../../types/paper'

  interface Props {
    paper: Paper
  }

  let { paper } = $props()

  let content = $state('')
  let isSaving = $state(false)
  let showExportDialog = $state(false)
  let pendingSave: ReturnType<typeof setTimeout> | null = null

  $effect(() => {
    if (paper && $currentPaperNote?.notes[0]) {
      content = $currentPaperNote.notes[0].content
    } else {
      content = ''
    }
  })

  function debouncedSave(newContent: string) {
    content = newContent

    if (pendingSave) clearTimeout(pendingSave)

    isSaving = true
    pendingSave = setTimeout(async () => {
      if (!$workspace) return

      try {
        await saveNote($workspace.path, paper.id, content)
        console.log(`[NotesPanel] Auto-saved for ${paper.id}`)
      } catch (error) {
        console.error('[NotesPanel] Save failed:', error)
      } finally {
        isSaving = false
        pendingSave = null
      }
    }, 300)
  }

  function handleEditorBlur() {
    if (pendingSave) {
      clearTimeout(pendingSave)
      pendingSave = null
    }

    if ($workspace && content) {
      saveNote($workspace.path, paper.id, content)
    }
  }
</script>

<div class="notes-panel">
  <div class="notes-header">
    <h2 class="title">📝 Notes: {paper.title || 'Untitled'}</h2>
    <div class="controls">
      <button
        class="export-btn"
        onclick={() => (showExportDialog = true)}
        disabled={!content}
      >
        ⬇️ Export
      </button>
      {#if isSaving}
        <span class="save-indicator">Saving...</span>
      {/if}
    </div>
  </div>

  <div class="editor-wrapper">
    <NotesEditor
      bind:content
      onChange={debouncedSave}
    />
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
</style>
