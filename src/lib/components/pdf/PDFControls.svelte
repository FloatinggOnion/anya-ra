<script lang="ts">
  /**
   * PDFControls — navigation toolbar with page prev/next and zoom in/out controls.
   */
  interface Props {
    currentPage: number
    totalPages: number
    scale: number
    onPageChange: (page: number) => void
    onZoomChange: (scale: number) => void
  }

  let { currentPage, totalPages, scale, onPageChange, onZoomChange }: Props = $props()

  const ZOOM_LEVELS = [0.5, 0.75, 1.0, 1.25, 1.5, 1.75, 2.0, 2.5, 3.0]

  const zoomPercent = $derived(Math.round(scale * 100))
  const isFirstPage = $derived(currentPage <= 1)
  const isLastPage = $derived(currentPage >= totalPages)
  const canZoomIn = $derived(scale < 3.0)
  const canZoomOut = $derived(scale > 0.5)

  function prevPage() {
    if (!isFirstPage) onPageChange(currentPage - 1)
  }

  function nextPage() {
    if (!isLastPage) onPageChange(currentPage + 1)
  }

  function zoomIn() {
    const next = ZOOM_LEVELS.find((z) => z > scale + 0.001)
    if (next !== undefined) onZoomChange(next)
  }

  function zoomOut() {
    const prev = [...ZOOM_LEVELS].reverse().find((z) => z < scale - 0.001)
    if (prev !== undefined) onZoomChange(prev)
  }

  function handlePageInput(e: Event) {
    const input = e.target as HTMLInputElement
    const val = parseInt(input.value, 10)
    if (!isNaN(val) && val >= 1 && val <= totalPages) {
      onPageChange(val)
    } else {
      input.value = String(currentPage)
    }
  }
</script>

<div class="pdf-controls" role="toolbar" aria-label="PDF viewer controls">
  <!-- Page navigation -->
  <div class="control-group page-nav" role="group" aria-label="Page navigation">
    <button
      class="ctrl-btn"
      aria-label="Previous page"
      title="Previous page (←)"
      disabled={isFirstPage}
      onclick={prevPage}
    >
      ◀
    </button>

    <div class="page-counter" aria-label="Page {currentPage} of {totalPages}">
      <input
        class="page-input"
        type="number"
        min="1"
        max={totalPages}
        value={currentPage}
        aria-label="Current page number"
        onchange={handlePageInput}
        onblur={handlePageInput}
      />
      <span class="page-sep">/</span>
      <span class="total-pages" aria-label="Total pages">{totalPages}</span>
    </div>

    <button
      class="ctrl-btn"
      aria-label="Next page"
      title="Next page (→)"
      disabled={isLastPage}
      onclick={nextPage}
    >
      ▶
    </button>
  </div>

  <div class="separator" role="separator" aria-orientation="vertical"></div>

  <!-- Zoom controls -->
  <div class="control-group zoom-controls" role="group" aria-label="Zoom controls">
    <button
      class="ctrl-btn"
      aria-label="Zoom out"
      title="Zoom out (-)"
      disabled={!canZoomOut}
      onclick={zoomOut}
    >
      −
    </button>

    <span class="zoom-display" aria-label="Zoom level: {zoomPercent}%">
      {zoomPercent}%
    </span>

    <button
      class="ctrl-btn"
      aria-label="Zoom in"
      title="Zoom in (+)"
      disabled={!canZoomIn}
      onclick={zoomIn}
    >
      +
    </button>
  </div>
</div>

<style>
  .pdf-controls {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 6px 12px;
    background: var(--color-surface, #1a1a1a);
    border-bottom: 1px solid var(--color-border, #2a2a2a);
    flex-shrink: 0;
    user-select: none;
  }

  .control-group {
    display: flex;
    align-items: center;
    gap: 4px;
  }

  .ctrl-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 28px;
    height: 28px;
    padding: 0;
    background: var(--color-surface, #1a1a1a);
    border: 1px solid var(--color-border, #2a2a2a);
    border-radius: 4px;
    color: var(--color-text, #f0f0f0);
    cursor: pointer;
    font-size: 13px;
    transition: background 0.1s, border-color 0.1s;
  }

  .ctrl-btn:hover:not(:disabled) {
    background: var(--color-surface-hover, #2a2a2a);
    border-color: var(--color-accent, #6b9cff);
  }

  .ctrl-btn:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }

  .ctrl-btn:focus-visible {
    outline: 2px solid var(--color-accent, #6b9cff);
    outline-offset: 2px;
  }

  .page-counter {
    display: flex;
    align-items: center;
    gap: 4px;
    font-size: 13px;
    color: var(--color-text, #f0f0f0);
  }

  .page-input {
    width: 40px;
    text-align: center;
    background: var(--color-surface, #1a1a1a);
    border: 1px solid var(--color-border, #2a2a2a);
    border-radius: 4px;
    color: var(--color-text, #f0f0f0);
    font-size: 13px;
    padding: 2px 4px;
    /* Hide browser number input arrows */
    -moz-appearance: textfield;
  }

  .page-input::-webkit-outer-spin-button,
  .page-input::-webkit-inner-spin-button {
    -webkit-appearance: none;
    margin: 0;
  }

  .page-input:focus {
    outline: 2px solid var(--color-accent, #6b9cff);
    outline-offset: 2px;
  }

  .page-sep,
  .total-pages {
    color: var(--color-text-secondary, #aaaaaa);
  }

  .zoom-display {
    min-width: 44px;
    text-align: center;
    font-size: 13px;
    color: var(--color-text, #f0f0f0);
    font-variant-numeric: tabular-nums;
  }

  .separator {
    width: 1px;
    height: 20px;
    background: var(--color-border, #2a2a2a);
    margin: 0 4px;
    flex-shrink: 0;
  }
</style>
