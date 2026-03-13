<script lang="ts">
  import type { Paper } from '../../types/paper'
  import type { Note } from '../../types/notes'

  interface Props {
    paper: Paper
    content: string
    onClose: () => void
  }

  let { paper, content, onClose } = $props()

  let isExporting = $state(false)
  let exportError = $state('')

  async function handleExportPDF() {
    if (!content) return
    isExporting = true
    exportError = ''

    try {
      const { exportNotesToPDF, downloadFile } = await import('../../services/notes-export')
      const note: Note = {
        id: paper.id,
        paperId: paper.id,
        content,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }

      const blob = await exportNotesToPDF(paper.title, paper.authors, note)
      const filename = `${paper.title.replace(/[^\w\s-]/g, '').slice(0, 50)}_notes.pdf`
      await downloadFile(blob, filename)

      onClose()
    } catch (error) {
      exportError = error instanceof Error ? error.message : 'Export failed'
      console.error('[ExportDialog] PDF export failed:', error)
    } finally {
      isExporting = false
    }
  }

  async function handleExportDOCX() {
    if (!content) return
    isExporting = true
    exportError = ''

    try {
      const { exportNotesToDOCX, downloadFile } = await import('../../services/notes-export')
      const note: Note = {
        id: paper.id,
        paperId: paper.id,
        content,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }

      const blob = await exportNotesToDOCX(paper.title, paper.authors, note)
      const filename = `${paper.title.replace(/[^\w\s-]/g, '').slice(0, 50)}_notes.docx`
      await downloadFile(blob, filename)

      onClose()
    } catch (error) {
      exportError = error instanceof Error ? error.message : 'Export failed'
      console.error('[ExportDialog] DOCX export failed:', error)
    } finally {
      isExporting = false
    }
  }
</script>

<div class="overlay">
  <div class="modal">
    <h3>📥 Export Notes</h3>
    <p class="subtitle">{paper.title}</p>

    {#if exportError}
      <div class="error">{exportError}</div>
    {/if}

    <div class="actions">
      <button class="btn-primary" onclick={handleExportPDF} disabled={isExporting}>
        {isExporting ? 'Exporting...' : 'PDF'}
      </button>
      <button class="btn-primary" onclick={handleExportDOCX} disabled={isExporting}>
        {isExporting ? 'Exporting...' : 'DOCX'}
      </button>
      <button class="btn-secondary" onclick={onClose} disabled={isExporting}>
        Cancel
      </button>
    </div>
  </div>
</div>

<style>
  .overlay {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.5);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
  }

  .modal {
    background: #1e1e2e;
    border: 1px solid #45475a;
    border-radius: 8px;
    padding: 20px;
    width: 320px;
    max-width: 90vw;
  }

  h3 {
    margin: 0 0 8px;
    color: #cdd6f4;
    font-size: 16px;
  }

  .subtitle {
    margin: 0 0 16px;
    font-size: 12px;
    color: #a6adc8;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .error {
    margin-bottom: 12px;
    padding: 8px;
    background: rgba(243, 139, 168, 0.1);
    border: 1px solid #f38ba8;
    border-radius: 4px;
    font-size: 12px;
    color: #f38ba8;
  }

  .actions {
    display: flex;
    gap: 8px;
    flex-direction: column;
  }

  button {
    padding: 8px 16px;
    border-radius: 4px;
    border: none;
    font-size: 13px;
    cursor: pointer;
    font-weight: 500;
  }

  .btn-primary {
    background: #89b4fa;
    color: #1e1e2e;
  }

  .btn-primary:hover:not(:disabled) {
    opacity: 0.9;
  }

  .btn-secondary {
    background: #313244;
    color: #a6adc8;
    border: 1px solid #45475a;
  }

  .btn-secondary:hover:not(:disabled) {
    background: #45475a;
  }

  button:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
</style>
