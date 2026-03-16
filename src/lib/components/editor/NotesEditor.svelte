<script lang="ts">
  import CodeMirror from 'svelte-codemirror-editor'
  import { markdown } from '@codemirror/lang-markdown'
  import { EditorView } from 'codemirror'
  import { onMount } from 'svelte'

  interface Props {
    content: string
    onChange: (content: string) => void
  }

  let { content = $bindable(''), onChange } = $props()
  let editorElement: HTMLDivElement | undefined = $state()

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
    const cmEditor = editorElement.querySelector('.cm-editor')
    const handleBlur = () => onChange(content)
    if (cmEditor) {
      cmEditor.addEventListener('blur', handleBlur)
    }

    return () => {
      if (cmEditor) {
        cmEditor.removeEventListener('blur', handleBlur)
      }
    }
  })

  function handleKeydown(e: KeyboardEvent) {
    if ((e.ctrlKey || e.metaKey) && e.key === 's') {
      e.preventDefault()
      onChange(content)
    }
  }
</script>

<div class="editor-container" bind:this={editorElement} onkeydown={handleKeydown} role="textbox" tabindex="0">
  <CodeMirror
    bind:value={content}
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

  :global(.cm-editor) {
    flex: 1;
  }

  :global(.cm-content) {
    padding: 16px;
  }

  :global(.cm-line) {
    padding: 0 4px;
  }
</style>
