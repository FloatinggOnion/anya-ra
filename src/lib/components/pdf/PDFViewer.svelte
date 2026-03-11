<script lang="ts">
  /**
   * PDFViewer — main PDF viewer component.
   * Integrates PDF.js rendering, annotation overlay, text selection,
   * annotation toolbar, sticky notes, page navigation, and performance caches.
   */
  import { onMount, onDestroy } from 'svelte'
  import { convertFileSrc } from '@tauri-apps/api/core'
  import { initPDFWorker, pdfjsLib } from '../../pdf/pdf-init'
  import { PageCache } from '../../pdf/page-cache'
  import { ViewportManager } from '../../pdf/viewport-manager'
  import { TextSelectionHandler } from '../../pdf/text-selection'
  import { get } from 'svelte/store'
  import {
    annotations,
    addAnnotation,
    updateAnnotation,
    deleteAnnotation,
    setAnnotations,
    clearAnnotations,
    currentPage as currentPageStore,
  } from '../../stores/annotations'
  import { loadAnnotations, saveAnnotations, computePdfHash } from '../../services/annotation-store'
  import PDFCanvas from './PDFCanvas.svelte'
  import AnnotationOverlay from './AnnotationOverlay.svelte'
  import StickyNoteLayer from './StickyNoteLayer.svelte'
  import AnnotationToolbar from './AnnotationToolbar.svelte'
  import PDFControls from './PDFControls.svelte'
  import type { Annotation, AnnotationSidecar, PDFViewport } from '../../types/annotation'

  interface Props {
    pdfPath: string
    paperId: string
  }

  let { pdfPath, paperId }: Props = $props()

  // PDF state
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let pdf = $state<any>(null)
  let totalPages = $state(0)
  let currentPage = $state(1)
  let scale = $state(1.5)
  let viewport = $state<PDFViewport | null>(null)
  let isLoading = $state(true)
  let loadError = $state<string | null>(null)

  // Annotation toolbar state
  let showToolbar = $state(false)
  let toolbarPosition = $state({ top: 0, left: 0 })
  let selectionText = $state('')
  let selectionRects = $state<ReturnType<typeof TextSelectionHandler.prototype.getSelection>['rects']>([])

  // Viewer container
  let viewerEl: HTMLDivElement | undefined = $state()
  let scrollEl: HTMLDivElement | undefined = $state()

  // Services
  const pageCache = new PageCache()
  let viewportManager: ViewportManager
  const selectionHandler = new TextSelectionHandler()

  // ─── Lifecycle ───────────────────────────────────────────────────────────────

  onMount(async () => {
    initPDFWorker()

    viewportManager = new ViewportManager((state) => {
      scale = state.scale
    }, scale)

    await loadPdf()
  })

  onDestroy(() => {
    viewportManager?.destroy()
    selectionHandler.detach()
    clearAnnotations()
    pageCache.clear()
  })

  // ─── PDF Loading ─────────────────────────────────────────────────────────────

  async function loadPdf() {
    isLoading = true
    loadError = null

    try {
      const url = convertFileSrc(pdfPath)
      const loadTask = pdfjsLib.getDocument({ url })
      const doc = await loadTask.promise
      pdf = doc as unknown as typeof pdf
      totalPages = doc.numPages
      currentPage = 1
      currentPageStore.set(1)

      // Load annotations from sidecar
      await loadAnnotationsFromSidecar()
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err))
      loadError = `Failed to load PDF: ${error.message}`
      console.error('[PDFViewer] Load error:', error)
    } finally {
      isLoading = false
    }
  }

  async function loadAnnotationsFromSidecar() {
    try {
      const sidecar = await loadAnnotations(pdfPath)
      if (sidecar) {
        setAnnotations(sidecar.annotations)
      }
    } catch (err) {
      console.warn('[PDFViewer] Could not load annotations:', err)
    }
  }

  async function persistAnnotations() {
    let pdfHash = 'unknown'
    try {
      pdfHash = await computePdfHash(pdfPath)
    } catch {
      // Hash computation failure is non-fatal
    }

    const currentAnnotations = get(annotations)

    const sidecar: AnnotationSidecar = {
      version: 1,
      pdfHash,
      annotations: currentAnnotations,
    }

    try {
      await saveAnnotations(pdfPath, sidecar)
    } catch (err) {
      console.error('[PDFViewer] Failed to save annotations:', err)
    }
  }

  // ─── Page navigation ─────────────────────────────────────────────────────────

  function handlePageChange(page: number) {
    if (page >= 1 && page <= totalPages) {
      currentPage = page
      currentPageStore.set(page)
    }
  }

  function handleZoomChange(newScale: number) {
    viewportManager?.handleZoom(newScale)
    // Invalidate cache for old scale before zoom
    pageCache.invalidateScale(scale)
  }

  function handlePageRender(vp: PDFViewport) {
    viewport = vp
    if (viewerEl) {
      selectionHandler.updateViewport(vp)
    }
  }

  // ─── Text selection & annotation creation ────────────────────────────────────

  function handleMouseUp(e: MouseEvent) {
    if (!viewport) return

    const selection = selectionHandler.getSelection()
    if (selection.text && selection.rects.length > 0) {
      selectionText = selection.text
      selectionRects = selection.rects
      showToolbar = true
      // Position toolbar near the mouse
      toolbarPosition = {
        top: e.clientY - (viewerEl?.getBoundingClientRect().top ?? 0),
        left: e.clientX - (viewerEl?.getBoundingClientRect().left ?? 0),
      }
    } else {
      showToolbar = false
    }
  }

  function createHighlight(color: 'yellow' | 'green' | 'red') {
    const now = new Date().toISOString()
    const annotation: Annotation = {
      id: crypto.randomUUID(),
      type: 'highlight',
      page: currentPage,
      rects: selectionRects,
      color,
      selectedText: selectionText,
      createdAt: now,
      updatedAt: now,
    }
    addAnnotation(annotation)
    selectionHandler.clearSelection()
    showToolbar = false
    persistAnnotations()
  }

  function createUnderline(color: 'yellow' | 'green' | 'red') {
    const now = new Date().toISOString()
    const annotation: Annotation = {
      id: crypto.randomUUID(),
      type: 'underline',
      page: currentPage,
      rects: selectionRects,
      color,
      selectedText: selectionText,
      createdAt: now,
      updatedAt: now,
    }
    addAnnotation(annotation)
    selectionHandler.clearSelection()
    showToolbar = false
    persistAnnotations()
  }

  function createStickyNote() {
    if (!selectionRects.length || !viewport) return
    const now = new Date().toISOString()
    const annotation: Annotation = {
      id: crypto.randomUUID(),
      type: 'sticky',
      page: currentPage,
      rects: [selectionRects[0]],
      note: '',
      createdAt: now,
      updatedAt: now,
    }
    addAnnotation(annotation)
    selectionHandler.clearSelection()
    showToolbar = false
    persistAnnotations()
  }

  function handleAnnotationSelect(annotation: Annotation) {
    // Future: open edit panel
    console.log('[PDFViewer] Selected annotation:', annotation.id)
  }

  function handleNoteUpdate(id: string, content: string) {
    updateAnnotation(id, { note: content })
    persistAnnotations()
  }

  function handleNoteDelete(id: string) {
    deleteAnnotation(id)
    persistAnnotations()
  }

  function dismissToolbar() {
    showToolbar = false
    selectionHandler.clearSelection()
  }

  // ─── Scroll handling ─────────────────────────────────────────────────────────

  function handleScroll(e: Event) {
    const el = e.target as HTMLElement
    viewportManager?.handleScroll(el.scrollTop, el.scrollLeft)
  }
</script>

<div class="pdf-viewer" bind:this={viewerEl}>
  {#if !isLoading && !loadError}
    <PDFControls
      {currentPage}
      {totalPages}
      {scale}
      onPageChange={handlePageChange}
      onZoomChange={handleZoomChange}
    />
  {/if}

  <div
    class="pdf-scroll-container"
    bind:this={scrollEl}
    onscroll={handleScroll}
    onmouseup={handleMouseUp}
    role="document"
    aria-label="PDF document viewer"
  >
    {#if isLoading}
      <div class="loading-state" aria-live="polite">
        <div class="spinner"></div>
        <span>Loading PDF…</span>
      </div>
    {:else if loadError}
      <div class="error-state" role="alert">
        <span class="error-icon">⚠️</span>
        <p>{loadError}</p>
        <button class="retry-btn" onclick={loadPdf}>Retry</button>
      </div>
    {:else if pdf}
      <div class="pdf-page-container">
        <!-- PDF page canvas -->
        <PDFCanvas
          {pdf}
          pageNum={currentPage}
          {scale}
          {pageCache}
          onPageRender={handlePageRender}
        />

        <!-- SVG annotation overlay (positioned over canvas) -->
        {#if viewport}
          <div class="overlay-container" style="width: {viewport.width}px; height: {viewport.height}px;">
            <AnnotationOverlay
              annotations={$annotations}
              {currentPage}
              {viewport}
              onAnnotationSelect={handleAnnotationSelect}
            />
            <StickyNoteLayer
              annotations={$annotations}
              {currentPage}
              {viewport}
              onUpdate={handleNoteUpdate}
              onDelete={handleNoteDelete}
            />
          </div>
        {/if}

        <!-- Annotation toolbar (shown on text selection) -->
        {#if showToolbar}
          <AnnotationToolbar
            selectedText={selectionText}
            selectedRects={selectionRects}
            pageNum={currentPage}
            position={toolbarPosition}
            onCreateHighlight={createHighlight}
            onCreateUnderline={createUnderline}
            onCreateNote={createStickyNote}
            onDismiss={dismissToolbar}
          />
        {/if}
      </div>
    {/if}
  </div>
</div>

<style>
  .pdf-viewer {
    display: flex;
    flex-direction: column;
    width: 100%;
    height: 100%;
    background: var(--color-bg, #0f0f0f);
    overflow: hidden;
    position: relative;
  }

  .pdf-scroll-container {
    flex: 1;
    overflow: auto;
    display: flex;
    justify-content: center;
    padding: 24px;
    scroll-behavior: smooth;
  }

  .pdf-page-container {
    position: relative;
    display: inline-flex;
    flex-direction: column;
    align-items: center;
    gap: 16px;
    flex-shrink: 0;
  }

  .overlay-container {
    position: absolute;
    top: 0;
    left: 0;
    pointer-events: none;
  }

  .overlay-container > :global(*) {
    pointer-events: all;
  }

  .loading-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 16px;
    height: 200px;
    color: var(--color-text-secondary, #aaaaaa);
    font-size: 14px;
  }

  .spinner {
    width: 32px;
    height: 32px;
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
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 12px;
    padding: 32px;
    text-align: center;
    color: var(--color-text, #f0f0f0);
  }

  .error-icon {
    font-size: 2rem;
  }

  .error-state p {
    color: var(--color-text-secondary, #aaaaaa);
    font-size: 14px;
    max-width: 320px;
  }

  .retry-btn {
    padding: 8px 20px;
    background: var(--color-accent, #6b9cff);
    color: #fff;
    border: none;
    border-radius: 6px;
    cursor: pointer;
    font-size: 14px;
    transition: opacity 0.15s;
  }

  .retry-btn:hover {
    opacity: 0.85;
  }
</style>
