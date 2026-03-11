<script lang="ts">
  /**
   * PDFCanvas — renders a single PDF page to an HTML5 canvas using PDF.js.
   * Uses the PageCache for pre-rendered page lookup to ensure 60fps.
   */
  import { onMount } from 'svelte'
  import type { PDFViewport } from '../../types/annotation'
  import { PageCache } from '../../pdf/page-cache'

  // We defer the PDF.js type import to avoid SSR issues
  type PDFDocumentProxy = {
    numPages: number
    getPage(num: number): Promise<unknown>
  }

  interface Props {
    pdf: PDFDocumentProxy | null
    pageNum: number
    scale: number
    pageCache?: PageCache
    onPageRender?: (viewport: PDFViewport) => void
    onError?: (error: Error) => void
  }

  let {
    pdf,
    pageNum,
    scale,
    pageCache,
    onPageRender,
    onError,
  }: Props = $props()

  let canvasEl: HTMLCanvasElement | undefined = $state()
  let containerEl: HTMLDivElement | undefined = $state()
  let isRendering = $state(false)
  let renderError = $state<string | null>(null)

  // Internal cache (fallback if no pageCache provided)
  const localCache = new PageCache()
  const effectiveCache = $derived(pageCache ?? localCache)

  async function renderPage() {
    if (!pdf || !canvasEl) return

    isRendering = true
    renderError = null

    try {
      const { canvas: renderedCanvas, viewport } = await effectiveCache.renderPage(
        pdf as Parameters<typeof effectiveCache.renderPage>[0],
        pageNum,
        scale
      )

      // Set canvas dimensions from the rendered canvas
      canvasEl.width = renderedCanvas.width
      canvasEl.height = renderedCanvas.height

      // Copy rendered content to our canvas element
      const ctx = canvasEl.getContext('2d')
      if (ctx) {
        ctx.clearRect(0, 0, canvasEl.width, canvasEl.height)
        ctx.drawImage(renderedCanvas, 0, 0)
      }

      // Prefetch adjacent pages in the background
      effectiveCache.prefetchAdjacent(
        pdf as Parameters<typeof effectiveCache.prefetchAdjacent>[0],
        pageNum,
        scale
      )

      onPageRender?.(viewport)
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err))
      renderError = error.message
      onError?.(error)
      console.error('[PDFCanvas] Render error:', error)
    } finally {
      isRendering = false
    }
  }

  // Re-render when pdf, pageNum, or scale changes
  $effect(() => {
    if (pdf && canvasEl) {
      // Track dependencies
      const _pdf = pdf
      const _page = pageNum
      const _scale = scale
      renderPage()
    }
  })

  onMount(() => {
    if (pdf && canvasEl) {
      renderPage()
    }
  })
</script>

<div class="pdf-canvas-container" bind:this={containerEl}>
  {#if isRendering}
    <div class="loading-overlay" aria-live="polite" aria-label="Rendering page {pageNum}">
      <div class="spinner"></div>
    </div>
  {/if}

  {#if renderError}
    <div class="error-state" role="alert">
      <span>⚠️ Failed to render page {pageNum}: {renderError}</span>
    </div>
  {/if}

  <!-- Canvas dimensions set via attributes (not CSS) to avoid blur on HiDPI -->
  <canvas
    bind:this={canvasEl}
    class="pdf-canvas"
    aria-label="PDF page {pageNum}"
  ></canvas>
</div>

<style>
  .pdf-canvas-container {
    position: relative;
    display: inline-block;
    line-height: 0;
  }

  .pdf-canvas {
    display: block;
    /* CSS size follows attribute dimensions — do NOT set explicit CSS width/height */
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
    background: #fff;
  }

  .loading-overlay {
    position: absolute;
    inset: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    background: rgba(15, 15, 15, 0.5);
    z-index: 5;
  }

  .spinner {
    width: 24px;
    height: 24px;
    border: 3px solid var(--color-border, #3a3a3a);
    border-top-color: var(--color-accent, #6b9cff);
    border-radius: 50%;
    animation: spin 0.6s linear infinite;
  }

  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }

  .error-state {
    position: absolute;
    inset: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    background: rgba(15, 15, 15, 0.85);
    color: var(--color-text, #f0f0f0);
    font-size: 13px;
    padding: 16px;
    text-align: center;
    z-index: 5;
  }
</style>
