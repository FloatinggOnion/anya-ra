<script lang="ts">
  /**
   * AnnotationToolbar — floating toolbar shown when text is selected in PDF viewer.
   * Provides buttons to create highlights (yellow/green/red), underlines, and sticky notes.
   */
  import type { Rect } from '../../types/annotation'

  interface Props {
    selectedText: string
    selectedRects: Rect[]
    pageNum: number
    position?: { top: number; left: number }
    onCreateHighlight: (color: 'yellow' | 'green' | 'red') => void
    onCreateUnderline: (color: 'yellow' | 'green' | 'red') => void
    onCreateNote: () => void
    onDismiss: () => void
  }

  let {
    selectedText,
    selectedRects,
    pageNum,
    position = { top: 0, left: 0 },
    onCreateHighlight,
    onCreateUnderline,
    onCreateNote,
    onDismiss,
  }: Props = $props()

  // Click-outside detection
  function handleDocumentClick(e: MouseEvent) {
    const target = e.target as HTMLElement
    const toolbar = document.getElementById('annotation-toolbar')
    if (toolbar && !toolbar.contains(target)) {
      onDismiss()
    }
  }

  $effect(() => {
    document.addEventListener('mousedown', handleDocumentClick)
    return () => document.removeEventListener('mousedown', handleDocumentClick)
  })
</script>

<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
<div
  id="annotation-toolbar"
  class="annotation-toolbar"
  role="toolbar"
  aria-label="Annotation options"
  tabindex="-1"
  style="top: {position.top}px; left: {position.left}px;"
  onmousedown={(e) => e.stopPropagation()}
>
  <!-- Highlight buttons -->
  <button
    class="toolbar-btn highlight-btn yellow"
    aria-label="Highlight yellow"
    title="Highlight yellow"
    onclick={() => onCreateHighlight('yellow')}
  >
    🟡
  </button>
  <button
    class="toolbar-btn highlight-btn green"
    aria-label="Highlight green"
    title="Highlight green"
    onclick={() => onCreateHighlight('green')}
  >
    🟢
  </button>
  <button
    class="toolbar-btn highlight-btn red"
    aria-label="Highlight red"
    title="Highlight red"
    onclick={() => onCreateHighlight('red')}
  >
    🔴
  </button>

  <div class="separator" role="separator" aria-orientation="vertical"></div>

  <!-- Underline button -->
  <button
    class="toolbar-btn underline-btn"
    aria-label="Underline"
    title="Underline"
    onclick={() => onCreateUnderline('yellow')}
  >
    <span class="underline-icon">U̲</span>
  </button>

  <div class="separator" role="separator" aria-orientation="vertical"></div>

  <!-- Sticky note button -->
  <button
    class="toolbar-btn note-btn"
    aria-label="Add sticky note"
    title="Add sticky note"
    onclick={onCreateNote}
  >
    📝
  </button>
</div>

<style>
  .annotation-toolbar {
    position: absolute;
    z-index: 1000;
    display: flex;
    align-items: center;
    gap: 2px;
    padding: 4px 6px;
    background: var(--color-surface, #1e1e1e);
    border: 1px solid var(--color-border, #3a3a3a);
    border-radius: 8px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.4);
    user-select: none;
    transform: translateY(-100%) translateY(-8px);
  }

  .toolbar-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 28px;
    height: 28px;
    padding: 0;
    background: none;
    border: 1px solid transparent;
    border-radius: 4px;
    cursor: pointer;
    font-size: 16px;
    color: var(--color-text, #f0f0f0);
    transition: background 0.1s, border-color 0.1s;
  }

  .toolbar-btn:hover {
    background: var(--color-surface-hover, #2a2a2a);
    border-color: var(--color-border, #3a3a3a);
  }

  .toolbar-btn:focus-visible {
    outline: 2px solid var(--color-accent, #6b9cff);
    outline-offset: 2px;
  }

  .underline-icon {
    font-size: 14px;
    font-weight: bold;
    color: var(--color-text, #f0f0f0);
  }

  .separator {
    width: 1px;
    height: 20px;
    background: var(--color-border, #3a3a3a);
    margin: 0 2px;
    flex-shrink: 0;
  }
</style>
