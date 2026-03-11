<script lang="ts">
  /**
   * AnnotationOverlay — SVG layer positioned absolutely over the PDF canvas.
   * Renders highlights (semi-transparent rects) and underlines (lines).
   * All coordinates are stored in PDF space and transformed for display.
   */
  import type { Annotation, PDFViewport, Rect } from '../../types/annotation'
  import { transformPdfToCanvas } from '../../pdf/coordinate-transforms'

  interface Props {
    annotations: Annotation[]
    currentPage: number
    viewport: PDFViewport | null
    onAnnotationSelect?: (annotation: Annotation) => void
  }

  let {
    annotations,
    currentPage,
    viewport,
    onAnnotationSelect,
  }: Props = $props()

  // Color map for highlights and underlines
  const COLOR_MAP = {
    yellow: '#FFD700',
    green: '#4CAF50',
    red: '#F44336',
  }

  const DEFAULT_COLOR = '#FFD700'

  /** Get page annotations, transformed to canvas coordinates */
  const pageAnnotations = $derived(
    viewport
      ? annotations
          .filter((a) => a.page === currentPage)
          .map((a) => ({
            ...a,
            canvasRects: a.rects.map((r) => transformPdfToCanvas(r, viewport!)),
          }))
      : []
  )

  function getColor(annotation: Annotation): string {
    return annotation.color ? (COLOR_MAP[annotation.color] ?? DEFAULT_COLOR) : DEFAULT_COLOR
  }

  function handleAnnotationClick(annotation: Annotation, e: MouseEvent) {
    e.stopPropagation()
    onAnnotationSelect?.(annotation)
  }
</script>

{#if viewport}
  <svg
    class="annotation-overlay"
    width={viewport.width}
    height={viewport.height}
    style="width: {viewport.width}px; height: {viewport.height}px;"
    aria-label="Annotation overlay"
    role="img"
  >
    {#each pageAnnotations as annotation (annotation.id)}
      {#each annotation.canvasRects as rect, i}
        {#if annotation.type === 'highlight'}
          <!-- Semi-transparent highlight rectangle -->
          <rect
            x={rect.x}
            y={rect.y}
            width={rect.width}
            height={rect.height}
            fill={getColor(annotation)}
            fill-opacity="0.3"
            stroke={getColor(annotation)}
            stroke-opacity="0.5"
            stroke-width="0.5"
            style="mix-blend-mode: multiply; cursor: pointer;"
            role="button"
            aria-label="Highlight annotation: {annotation.selectedText ?? ''}"
            tabindex="0"
            onclick={(e) => handleAnnotationClick(annotation, e)}
            onkeydown={(e) => e.key === 'Enter' && handleAnnotationClick(annotation, e as unknown as MouseEvent)}
          />
        {:else if annotation.type === 'underline'}
          <!-- Underline at the bottom of the text rect -->
          <line
            x1={rect.x}
            y1={rect.y + rect.height}
            x2={rect.x + rect.width}
            y2={rect.y + rect.height}
            stroke={getColor(annotation)}
            stroke-width="2"
            stroke-linecap="round"
            style="cursor: pointer;"
            role="button"
            aria-label="Underline annotation: {annotation.selectedText ?? ''}"
            tabindex="0"
            onclick={(e) => handleAnnotationClick(annotation, e)}
            onkeydown={(e) => e.key === 'Enter' && handleAnnotationClick(annotation, e as unknown as MouseEvent)}
          />
        {/if}
      {/each}
    {/each}
  </svg>
{/if}

<style>
  .annotation-overlay {
    position: absolute;
    top: 0;
    left: 0;
    pointer-events: none; /* Allow clicks through except on annotation elements */
    z-index: 10;
    overflow: visible;
  }

  /* Enable pointer events on individual annotation elements */
  .annotation-overlay :global(rect),
  .annotation-overlay :global(line) {
    pointer-events: all;
  }

  .annotation-overlay :global(rect:hover),
  .annotation-overlay :global(line:hover) {
    filter: brightness(1.2);
  }

  .annotation-overlay :global(rect:focus-visible),
  .annotation-overlay :global(line:focus-visible) {
    outline: 2px solid var(--color-accent, #6b9cff);
    outline-offset: 2px;
  }
</style>
