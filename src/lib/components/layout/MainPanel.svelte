<script lang="ts">
  import PanelColumn from './PanelColumn.svelte'
  import { selectedPaper } from '../../stores/papers'
  import { workspace } from '../../stores/workspace'
  import { activeCenterTab, activeRightTab } from '../../stores/panel-layout'
  import { activeTab } from '../../stores/ui'
  import { join } from '@tauri-apps/api/path'

  // ─── PDF path resolution (unchanged logic) ───────────────────────────────
  let resolvedPdfPath = $state<string | null>(null)
  let PDFViewerComponent: any = $state(null)
  let GraphCanvasComponent: any = $state(null)
  let resolvePathRequest = 0

  function isAbsolutePath(path: string): boolean {
    return path.startsWith('/') || /^[A-Za-z]:[\\/]/.test(path)
  }

  $effect(() => {
    const paper = $selectedPaper
    const ws = $workspace
    if (paper?.localPdfPath && ws?.path) {
      const requestId = ++resolvePathRequest
      const localPath = paper.localPdfPath

      const assignResolved = (path: string) => {
        if (requestId !== resolvePathRequest) return
        resolvedPdfPath = path
      }

      if (isAbsolutePath(localPath)) {
        assignResolved(localPath)
      } else {
        join(ws.path, localPath).then(assignResolved)
      }
    } else {
      resolvePathRequest++
      resolvedPdfPath = null
    }
  })

  // ─── Lazy-load PDF viewer when pdf tab is active in either column ────────
  $effect(() => {
    if (($activeCenterTab === 'pdf' || $activeRightTab === 'pdf') && !PDFViewerComponent) {
      import('../pdf/PDFViewer.svelte').then((mod) => {
        PDFViewerComponent = mod.default
      })
    }
  })

  // ─── Lazy-load graph canvas when graph tab is active in either column ────
  $effect(() => {
    if (($activeCenterTab === 'graph' || $activeRightTab === 'graph') && !GraphCanvasComponent) {
      import('../graph/GraphCanvas.svelte').then((mod) => {
        GraphCanvasComponent = mod.default
      })
    }
  })

  // ─── Keep legacy activeTab store in sync for external consumers ──────────
  $effect(() => {
    activeTab.set($activeCenterTab)
  })
</script>

<div class="main-panel">
  <PanelColumn
    panelId="center"
    {resolvedPdfPath}
    {PDFViewerComponent}
    {GraphCanvasComponent}
  />
  <PanelColumn
    panelId="right"
    {resolvedPdfPath}
    {PDFViewerComponent}
    {GraphCanvasComponent}
  />
</div>

<style>
  .main-panel {
    display: grid;
    grid-template-columns: 1fr minmax(320px, 38%);
    gap: 8px;
    width: 100%;
    height: 100%;
    padding: 8px;
    box-sizing: border-box;
    background: var(--color-bg, #0f0f0f);
    overflow: hidden;
  }
</style>
