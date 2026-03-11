<script lang="ts">
  /**
   * StickyNoteLayer — renders sticky notes as absolutely-positioned HTML divs.
   * Uses contenteditable for in-place editing. Saves on blur.
   */
  import type { Annotation, PDFViewport } from '../../types/annotation'
  import { transformPdfToCanvas } from '../../pdf/coordinate-transforms'

  interface Props {
    annotations: Annotation[]
    currentPage: number
    viewport: PDFViewport | null
    onUpdate?: (id: string, content: string) => void
    onDelete?: (id: string) => void
  }

  let {
    annotations,
    currentPage,
    viewport,
    onUpdate,
    onDelete,
  }: Props = $props()

  /** Sticky notes for the current page */
  const stickyNotes = $derived(
    annotations.filter((a) => a.type === 'sticky' && a.page === currentPage)
  )

  /**
   * Calculate position for a sticky note (to the right of its anchor rect).
   */
  function getNotePosition(annotation: Annotation): { top: number; left: number } {
    if (!viewport || annotation.rects.length === 0) {
      return { top: 0, left: 0 }
    }
    const rect = annotation.rects[0]
    const canvasRect = transformPdfToCanvas(rect, viewport)
    return {
      top: canvasRect.y,
      left: canvasRect.x + canvasRect.width + 10,
    }
  }

  function handleBlur(annotation: Annotation, e: FocusEvent) {
    const target = e.target as HTMLElement
    const content = target.innerText ?? target.textContent ?? ''
    onUpdate?.(annotation.id, content)
  }

  function handleKeyDown(e: KeyboardEvent) {
    // Prevent PDF viewer shortcut conflicts within the note
    e.stopPropagation()
    // Save on Escape
    if (e.key === 'Escape') {
      ;(e.target as HTMLElement).blur()
    }
  }
</script>

{#if viewport}
  {#each stickyNotes as note (note.id)}
    {@const pos = getNotePosition(note)}
    <div
      class="sticky-note"
      style="top: {pos.top}px; left: {pos.left}px;"
      data-annotation-id={note.id}
    >
      <div class="note-header">
        <span class="note-icon" aria-hidden="true">📌</span>
        <span class="note-label">Note</span>
        <button
          class="delete-btn"
          aria-label="Delete note"
          title="Delete note"
          onclick={() => onDelete?.(note.id)}
        >
          ✕
        </button>
      </div>
      <!-- svelte-ignore a11y_interactive_supports_focus -->
      <div
        class="note-content"
        contenteditable="true"
        role="textbox"
        aria-label="Note content"
        aria-multiline="true"
        tabindex="0"
        onblur={(e) => handleBlur(note, e)}
        onkeydown={handleKeyDown}
      >
        {note.note ?? ''}
      </div>
    </div>
  {/each}
{/if}

<style>
  .sticky-note {
    position: absolute;
    z-index: 20;
    width: 200px;
    min-height: 80px;
    background: #ffffcc;
    border: 1px solid #ccc;
    border-radius: 4px;
    box-shadow: 2px 2px 8px rgba(0, 0, 0, 0.3);
    font-family: sans-serif;
    font-size: 13px;
    color: #333;
    overflow: hidden;
  }

  .note-header {
    display: flex;
    align-items: center;
    gap: 4px;
    padding: 4px 8px;
    background: #f0e060;
    border-bottom: 1px solid #ccc;
    cursor: move;
    user-select: none;
  }

  .note-icon {
    font-size: 12px;
  }

  .note-label {
    flex: 1;
    font-size: 11px;
    font-weight: 600;
    color: #555;
  }

  .delete-btn {
    padding: 0 4px;
    background: none;
    border: none;
    cursor: pointer;
    font-size: 12px;
    color: #888;
    line-height: 1;
    border-radius: 2px;
    transition: color 0.1s, background 0.1s;
  }

  .delete-btn:hover {
    color: #e33;
    background: rgba(220, 50, 50, 0.1);
  }

  .note-content {
    padding: 8px;
    min-height: 60px;
    outline: none;
    white-space: pre-wrap;
    word-break: break-word;
    line-height: 1.5;
    cursor: text;
  }

  .note-content:focus {
    background: #fffff0;
  }
</style>
