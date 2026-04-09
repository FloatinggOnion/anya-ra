<script lang="ts">
  import CodeMirror from 'svelte-codemirror-editor'
  import { markdown } from '@codemirror/lang-markdown'
  import { EditorView } from '@codemirror/view'
  import { onMount } from 'svelte'
  import { saveDocument } from '../../stores/documents'
  import { saveNote } from '../../stores/notes'
  import { workspace } from '../../stores/workspace'

  interface Props {
    type?: 'document' | 'paper'
    id?: string
    title?: string
    content: string
    onChange: (content: string) => void
    onBlur?: () => void
  }

  let { type = 'paper', id = '', title = '', content = $bindable(''), onChange, onBlur } = $props()
  let editorElement: HTMLDivElement | undefined = $state()
  let cmEditor: any = $state(null)  // Keep reference to CodeMirror editor

  const theme = EditorView.theme({
    '.cm-editor': {
      height: '100%',
      fontSize: '13px',
      fontFamily: '"Monaco", "Menlo", monospace',
    },
    '.cm-gutters': {
      backgroundColor: 'var(--color-surface-1)',
      borderRight: '1px solid var(--color-surface-2)',
    },
    '.cm-activeLineGutter': {
      backgroundColor: 'var(--color-surface-2)',
    },
  })

  onMount(() => {
    if (!editorElement) return

    // Find the CodeMirror editor element within the container
    const cmElement = editorElement.querySelector('.cm-editor')
    const handleBlur = () => {
      onChange(content)
      if (onBlur) onBlur()
    }
    if (cmElement) {
      cmElement.addEventListener('blur', handleBlur)
    }

    return () => {
      if (cmElement) {
        cmElement.removeEventListener('blur', handleBlur)
      }
    }
  })


  function handleKeydown(e: KeyboardEvent) {
    if ((e.ctrlKey || e.metaKey) && e.key === 's') {
      e.preventDefault()
      handleAutoSave(content)
    }
  }

  async function handleAutoSave(newContent: string) {
    const ws = $workspace
    if (!ws || !id) return

    try {
      if (type === 'document') {
        // For documents, parent (DocumentEditor) handles saveDocumentWithLinks
        // This is a fallback for manual Cmd+S
        await saveDocument(ws.path, id, title || 'Untitled', newContent)
      } else if (type === 'paper') {
        // Save to notes store
        await saveNote(ws.path, id, newContent)
      }
      console.log(`[NotesEditor] Auto-saved ${type} ${id}`)
    } catch (error) {
      console.error(`[NotesEditor] Auto-save failed for ${type} ${id}:`, error)
    }
  }
</script>

<div class="editor-container" bind:this={editorElement} onkeydown={handleKeydown} role="textbox" tabindex="0">
  {#if type && id}
    <div class="editor-context">
      <span class="context-label">Editing: {type}</span>
      {#if title}
        <span class="context-title">— {title}</span>
      {/if}
    </div>
  {/if}
  <CodeMirror
    bind:value={content}
    bind:this={cmEditor}
    lang={markdown()}
    {theme}
    editable={true}
  />
</div>

<style>
  .editor-container {
    height: 100%;
    display: flex;
    flex-direction: column;
    background: var(--color-surface-0);
    border-radius: 4px;
    overflow: hidden;
  }

  .editor-context {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.5rem 1rem;
    background: var(--color-surface-1);
    border-bottom: 1px solid var(--color-surface-2);
    font-size: 0.8125rem;
    color: var(--color-text-muted);
    flex-shrink: 0;
  }

  .context-label {
    font-weight: 500;
    color: var(--color-text-secondary);
  }

  .context-title {
    color: var(--color-text);
    font-style: italic;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  :global(.cm-editor) {
    flex: 1;
  }

  :global(.cm-content) {
    padding: 16px;
  }

  :global(.cm-line) {
    padding: 0 4px;
  }

  /* Citation validation feedback: red wavy underline for broken references */
  :global(.citation-error) {
    text-decoration: wavy underline #d63369;
    text-underline-offset: 2px;
    cursor: help;
    opacity: 0.95;
  }

  :global(.citation-error:hover) {
    opacity: 1;
  }
</style>
