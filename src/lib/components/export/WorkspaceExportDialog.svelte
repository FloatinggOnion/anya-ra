<script lang="ts">
  import { papers } from '../../stores/papers'
  import { notes } from '../../stores/notes'
  import { graphNodes, graphEdges, graphViewport } from '../../stores/graph'
  import { exportWorkspace, generateExportFilename } from '../../services/workspace-export'
  import { estimateExportSize } from '../../types/export'
  import { showToast } from '../../services/toast'
  import ExportProgress from './ExportProgress.svelte'
  import type { ExportOptions } from '../../types/export'
  import type { Note } from '../../types/notes'
  import type { GraphFile, PersistedNode, PersistedEdge, AnyaEdgeData, AnyNodeData } from '../../types/graph'

  // ─── State ───────────────────────────────────────────────────────────────

  let isOpen = $state(false)
  let isExporting = $state(false)
  let progress = $state(0)
  let estimatedTime = $state('')

  // Export options
  let includePDFs = $state(false)
  let includeAnnotations = $state(true)
  let includeGraph = $state(true)

  // Paper filtering
  let availableTags: string[] = $derived(
    Array.from(new Set($papers.flatMap(p => p.tags || [])))
  )
  let selectedTags = $state<string[]>([])

  const EMPTY_GRAPH: GraphFile = {
    version: 1,
    nodes: [],
    edges: [],
    viewport: { x: 0, y: 0, zoom: 1 },
  }

  let exportNotes: Note[] = $derived(
    Array.from($notes.entries()).flatMap(([paperId, sidecar]) =>
      sidecar.notes.map((note) => ({
        ...note,
        paperId: note.paperId || paperId,
      }))
    )
  )

  let exportGraphData: GraphFile = $derived({
    version: 1,
    nodes: $graphNodes.map(
      (n): PersistedNode => ({
        id: n.id,
        type: n.type as 'paper' | 'concept' | 'note',
        position: n.position,
        data: n.data as AnyNodeData,
      })
    ),
    edges: $graphEdges.map(
      (e): PersistedEdge => ({
        id: e.id,
        source: e.source,
        target: e.target,
        data: (e.data ?? { type: 'related' }) as AnyaEdgeData,
      })
    ),
    viewport: $graphViewport,
  })

  // Derived
  let filteredPapers = $derived(
    selectedTags.length > 0
      ? $papers.filter(p => selectedTags.some(t => (p.tags || []).includes(t)))
      : $papers
  )

  let estimatedSize = $derived(
    estimateExportSize(filteredPapers, exportNotes, {
      includePDFs,
      includeAnnotations,
      includeGraph
    })
  )

  let sizeLabel = $derived(
    estimatedSize.totalSize > 1024 * 1024 * 100
      ? `${(estimatedSize.totalSize / (1024 * 1024 * 1024)).toFixed(2)} GB`
      : `${(estimatedSize.totalSize / (1024 * 1024)).toFixed(1)} MB`
  )

  // ─── Event Handlers ──────────────────────────────────────────────────────

  function toggleTag(tag: string) {
    if (selectedTags.includes(tag)) {
      selectedTags = selectedTags.filter(t => t !== tag)
    } else {
      selectedTags = [...selectedTags, tag]
    }
  }

  async function handleExport() {
    if (filteredPapers.length === 0) {
      showToast('No papers to export', 'error')
      return
    }

    isExporting = true
    const startTime = Date.now()

    try {
      const options: ExportOptions = {
        includePDFs,
        includeAnnotations,
        includeGraph
      }

      const blob = await exportWorkspace(
        filteredPapers,
        exportNotes,
        includeGraph ? exportGraphData : EMPTY_GRAPH,
        options,
        (current, total) => {
          progress = (current / total) * 100
          const elapsed = (Date.now() - startTime) / 1000
          const rate = current / elapsed
          const remaining = (total - current) / rate
          estimatedTime = `${Math.ceil(remaining)}s`
        }
      )

      // Trigger download
      const filename = generateExportFilename()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = filename
      a.click()
      URL.revokeObjectURL(url)

      showToast(`Exported ${filteredPapers.length} papers to ${filename}`, 'success')
      isOpen = false
    } catch (e) {
      console.error('Export failed:', e)
      showToast('Export failed: ' + (e instanceof Error ? e.message : 'Unknown error'), 'error')
    } finally {
      isExporting = false
      progress = 0
      estimatedTime = ''
    }
  }

  function openDialog() {
    isOpen = true
  }

  function closeDialog() {
    if (!isExporting) {
      isOpen = false
    }
  }
</script>

<!-- Export Button (typically in main menu) -->
<button
  onclick={openDialog}
  disabled={$papers.length === 0}
  class="export-button"
  title="Export workspace as ZIP archive"
>
  📥 Export Workspace
</button>

<!-- Modal Dialog -->
{#if isOpen}
  <div class="modal-overlay" onclick={e => e.target === e.currentTarget && closeDialog()}>
    <div class="modal-content">
      <div class="modal-header">
        <h2>Export Research Workspace</h2>
        <button
          class="close-button"
          onclick={closeDialog}
          disabled={isExporting}
          aria-label="Close"
        >
          ✕
        </button>
      </div>

      {#if !isExporting}
        <div class="modal-body">
          <div class="section">
            <h3>Papers</h3>
            <p class="info">
              {$papers.length} papers total
              {selectedTags.length > 0
                ? `• ${filteredPapers.length} selected`
                : ''}
            </p>

            {#if availableTags.length > 0}
              <div class="tags-filter">
                <label>Filter by tags:</label>
                <div class="tags-list">
                  {#each availableTags as tag}
                    <button
                      class="tag-button"
                      class:active={selectedTags.includes(tag)}
                      onclick={() => toggleTag(tag)}
                      disabled={isExporting}
                    >
                      {tag}
                    </button>
                  {/each}
                </div>
              </div>
            {/if}
          </div>

          <div class="section">
            <h3>Export Options</h3>
            <label class="checkbox-label">
              <input
                type="checkbox"
                bind:checked={includePDFs}
                disabled={isExporting}
              />
              Include PDFs ({estimatedSize.pdfSize > 0 ? `+${(estimatedSize.pdfSize / (1024 * 1024)).toFixed(1)} MB` : 'No PDFs'})
            </label>
            <p class="hint">⚠️ Including PDFs significantly increases file size</p>

            <label class="checkbox-label">
              <input
                type="checkbox"
                bind:checked={includeAnnotations}
                disabled={isExporting}
              />
              Include annotations
            </label>

            <label class="checkbox-label">
              <input
                type="checkbox"
                bind:checked={includeGraph}
                disabled={isExporting}
              />
              Include knowledge graph
            </label>
          </div>

          <div class="section">
            <h3>File Size Estimate</h3>
            <p class="estimate">
              <strong>{sizeLabel}</strong> (compressed)
            </p>
          </div>
        </div>

        <div class="modal-footer">
          <button
            class="button button-secondary"
            onclick={closeDialog}
            disabled={isExporting}
          >
            Cancel
          </button>
          <button
            class="button button-primary"
            onclick={handleExport}
            disabled={isExporting || filteredPapers.length === 0}
          >
            Export ({filteredPapers.length})
          </button>
        </div>
      {:else}
        <div class="progress-section">
          <ExportProgress
            current={progress}
            total={100}
            label="{Math.round(progress)}% • {filteredPapers.length} papers"
            estimatedTime={estimatedTime}
          />
          <p class="progress-hint">Generating ZIP archive...</p>
        </div>
      {/if}
    </div>
  </div>
{/if}

<style>
  .export-button {
    padding: 8px 16px;
    background: #2a5f7f;
    color: #e0e0e0;
    border: none;
    border-radius: 6px;
    cursor: pointer;
    font-size: 14px;
    transition: all 0.2s;
  }

  .export-button:hover:not(:disabled) {
    background: #3a7fa0;
  }

  .export-button:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .modal-overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.7);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
  }

  .modal-content {
    background: #1a1a1a;
    border: 1px solid #333;
    border-radius: 8px;
    width: 90%;
    max-width: 500px;
    max-height: 80vh;
    display: flex;
    flex-direction: column;
    box-shadow: 0 10px 40px rgba(0, 0, 0, 0.5);
  }

  .modal-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 20px;
    border-bottom: 1px solid #333;
  }

  .modal-header h2 {
    margin: 0;
    font-size: 20px;
  }

  .close-button {
    background: none;
    border: none;
    color: #888;
    font-size: 20px;
    cursor: pointer;
    padding: 0;
    width: 24px;
    height: 24px;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: color 0.2s;
  }

  .close-button:hover:not(:disabled) {
    color: #e0e0e0;
  }

  .close-button:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .modal-body {
    flex: 1;
    overflow-y: auto;
    padding: 20px;
  }

  .section {
    margin-bottom: 24px;
  }

  .section h3 {
    margin: 0 0 12px 0;
    font-size: 14px;
    text-transform: uppercase;
    color: #888;
    font-weight: 600;
  }

  .info {
    color: #888;
    font-size: 13px;
    margin: 0;
  }

  .tags-filter {
    margin-top: 12px;
  }

  .tags-filter label {
    display: block;
    margin-bottom: 8px;
    font-size: 13px;
    color: #888;
  }

  .tags-list {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
  }

  .tag-button {
    padding: 6px 12px;
    background: #2a2a2a;
    color: #888;
    border: 1px solid #333;
    border-radius: 4px;
    cursor: pointer;
    font-size: 12px;
    transition: all 0.2s;
  }

  .tag-button:hover:not(:disabled) {
    border-color: #64b5f6;
    color: #64b5f6;
  }

  .tag-button.active {
    background: #2a5f7f;
    border-color: #64b5f6;
    color: #64b5f6;
  }

  .tag-button:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .checkbox-label {
    display: flex;
    align-items: center;
    gap: 10px;
    margin-bottom: 12px;
    cursor: pointer;
    font-size: 14px;
  }

  .checkbox-label input {
    cursor: pointer;
  }

  .checkbox-label:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .hint {
    margin: -8px 0 16px 26px;
    font-size: 12px;
    color: #666;
  }

  .estimate {
    background: #2a2a2a;
    padding: 12px;
    border-radius: 4px;
    margin: 0;
    font-size: 14px;
  }

  .progress-section {
    padding: 20px;
    text-align: center;
  }

  .progress-hint {
    color: #888;
    font-size: 13px;
    margin-top: 16px;
  }

  .modal-footer {
    display: flex;
    gap: 12px;
    padding: 20px;
    border-top: 1px solid #333;
    justify-content: flex-end;
  }

  .button {
    padding: 10px 20px;
    border: none;
    border-radius: 6px;
    cursor: pointer;
    font-size: 14px;
    font-weight: 500;
    transition: all 0.2s;
  }

  .button-primary {
    background: #2a7f5f;
    color: #e0e0e0;
  }

  .button-primary:hover:not(:disabled) {
    background: #3a9f7f;
  }

  .button-secondary {
    background: #333;
    color: #e0e0e0;
  }

  .button-secondary:hover:not(:disabled) {
    background: #444;
  }

  .button:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
</style>
