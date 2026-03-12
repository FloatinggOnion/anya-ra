<script lang="ts">
  import { selectedPaper } from '../stores/papers'
  import { updatePaper } from '../stores/papers'
  import { workspace } from '../stores/workspace'
  import { downloadPdfToWorkspace } from '../services/papers'
  import { ensurePaperNode, graphNodes } from '../stores/graph'

  const sourceLabel: Record<string, string> = {
    arxiv: 'arXiv',
    semantic_scholar: 'Semantic Scholar',
    local: 'Local',
  }

  let isDownloading = $state(false)
  let downloadError = $state('')

  const isInGraph = $derived(
    $graphNodes.some(
      (n) => n.data.kind === 'paper' && (n.data as { kind: 'paper'; paperId: string }).paperId === ($selectedPaper?.id ?? '')
    )
  )

  async function handleDownload() {
    if (!$selectedPaper || !$selectedPaper.pdfUrl || !$workspace) return
    isDownloading = true
    downloadError = ''
    try {
      const updated = await downloadPdfToWorkspace(
        $workspace.path,
        $selectedPaper,
        $selectedPaper.pdfUrl
      )
      updatePaper(updated)
    } catch (err) {
      downloadError = err instanceof Error ? err.message : String(err)
    } finally {
      isDownloading = false
    }
  }
</script>

<div class="paper-detail">
  {#if $selectedPaper}
    <div class="paper-content">
      <h2 class="title">{$selectedPaper.title}</h2>

      <div class="meta-section">
        {#if $selectedPaper.authors.length > 0}
          <div class="meta-row">
            <span class="label">Authors</span>
            <span class="value">{$selectedPaper.authors.join(', ')}</span>
          </div>
        {/if}
        {#if $selectedPaper.year}
          <div class="meta-row">
            <span class="label">Year</span>
            <span class="value">{$selectedPaper.year}</span>
          </div>
        {/if}
        <div class="meta-row">
          <span class="label">Source</span>
          <span class="value">{sourceLabel[$selectedPaper.source] ?? $selectedPaper.source}</span>
        </div>
        {#if $selectedPaper.doi}
          <div class="meta-row">
            <span class="label">DOI</span>
            <span class="value mono">{$selectedPaper.doi}</span>
          </div>
        {/if}
        {#if $selectedPaper.arxivId}
          <div class="meta-row">
            <span class="label">arXiv ID</span>
            <span class="value mono">{$selectedPaper.arxivId}</span>
          </div>
        {/if}
        <div class="meta-row">
          <span class="label">Access</span>
          {#if $selectedPaper.isOpenAccess}
            <span class="value oa">✓ Open Access</span>
          {:else if $selectedPaper.pdfUrl}
            <span class="value partial">Partial / Link available</span>
          {:else}
            <span class="value paywall">Paywalled — <a href={$selectedPaper.url} target="_blank" rel="noreferrer">View on source site ↗</a></span>
          {/if}
        </div>
      </div>

      {#if $selectedPaper.abstract}
        <div class="abstract-section">
          <h3>Abstract</h3>
          <p>{$selectedPaper.abstract}</p>
        </div>
      {/if}

      <div class="actions">
        {#if $selectedPaper.localPdfPath}
          <span class="btn secondary downloaded">✓ PDF Downloaded</span>
        {:else if $selectedPaper.pdfUrl}
          <a href={$selectedPaper.pdfUrl} target="_blank" rel="noreferrer" class="btn secondary">
            View PDF ↗
          </a>
          <button
            class="btn primary"
            onclick={handleDownload}
            disabled={isDownloading}
          >
            {#if isDownloading}
              <span class="spinner"></span>
              Downloading…
            {:else}
              ⬇ Download PDF
            {/if}
          </button>
        {:else if !$selectedPaper.localPdfPath}
          <button class="btn primary" disabled title="No PDF available for this paper">
            No PDF available
          </button>
        {/if}
        {#if downloadError}
          <p class="download-error">{downloadError}</p>
        {/if}
        {#if $selectedPaper.url}
          <a href={$selectedPaper.url} target="_blank" rel="noreferrer" class="btn secondary">
            Source page ↗
          </a>
        {/if}
        <button
          class="add-to-graph-btn"
          disabled={isInGraph}
          onclick={() => $selectedPaper && ensurePaperNode($selectedPaper)}
        >
          {isInGraph ? '🕸 In Graph ✓' : '🕸 Add to Graph'}
        </button>
      </div>
    </div>
  {:else}
    <div class="empty">
      <div class="empty-icon">📄</div>
      <p>Select a paper to view details</p>
    </div>
  {/if}
</div>

<style>
  .paper-detail {
    flex: 1;
    overflow-y: auto;
    padding: 1.5rem 2rem;
    background: var(--color-bg, #0f0f0f);
    height: 100%;
    box-sizing: border-box;

    scrollbar-width: thin;
    scrollbar-color: var(--color-border, #2a2a2a) transparent;
  }

  .paper-content {
    max-width: 800px;
  }

  .title {
    font-size: 1.375rem;
    font-weight: 700;
    color: var(--color-text, #f0f0f0);
    margin: 0 0 1.25rem 0;
    line-height: 1.35;
  }

  .meta-section {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    margin-bottom: 1.5rem;
    padding: 1rem;
    background: var(--color-surface, #1a1a1a);
    border: 1px solid var(--color-border, #2a2a2a);
    border-radius: 0.375rem;
  }

  .meta-row {
    display: flex;
    gap: 1rem;
    font-size: 0.875rem;
    align-items: flex-start;
  }

  .label {
    font-weight: 600;
    color: var(--color-text-muted, #666666);
    min-width: 72px;
    flex-shrink: 0;
    font-size: 0.8125rem;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    padding-top: 0.125rem;
  }

  .value {
    color: var(--color-text, #f0f0f0);
    line-height: 1.4;
  }

  .value.mono {
    font-family: monospace;
    font-size: 0.8125rem;
  }

  .value.oa {
    color: #4ade80;
    font-weight: 600;
  }

  .value.partial {
    color: #facc15;
  }

  .value.paywall {
    color: #f87171;
  }

  .value.paywall a {
    color: #f87171;
    text-decoration: underline;
  }

  .abstract-section {
    margin-bottom: 1.5rem;
  }

  .abstract-section h3 {
    font-size: 0.875rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: var(--color-text-muted, #666666);
    margin: 0 0 0.75rem 0;
  }

  .abstract-section p {
    line-height: 1.7;
    color: var(--color-text-secondary, #aaaaaa);
    font-size: 0.9375rem;
    margin: 0;
  }

  .actions {
    display: flex;
    gap: 0.75rem;
    flex-wrap: wrap;
  }

  .btn {
    display: inline-flex;
    align-items: center;
    padding: 0.5rem 1rem;
    border-radius: 0.25rem;
    font-size: 0.875rem;
    font-weight: 600;
    text-decoration: none;
    cursor: pointer;
    transition: background 0.15s, opacity 0.15s;
    border: 1px solid transparent;
  }

  .btn.primary {
    background: var(--color-accent, #6b9cff);
    color: #fff;
    border-color: var(--color-accent, #6b9cff);
  }

  .btn.primary:hover:not(:disabled) {
    background: var(--color-accent-hover, #5580e8);
  }

  .btn.primary:disabled {
    opacity: 0.35;
    cursor: not-allowed;
  }

  .btn.secondary {
    background: transparent;
    color: var(--color-text-secondary, #aaaaaa);
    border-color: var(--color-border, #2a2a2a);
  }

  .btn.secondary:hover {
    background: rgba(255, 255, 255, 0.04);
    color: var(--color-text, #f0f0f0);
  }

  .btn.secondary.downloaded {
    color: #4ade80;
    border-color: #4ade80;
    cursor: default;
    pointer-events: none;
  }

  .download-error {
    width: 100%;
    color: var(--color-error, #ff6b6b);
    font-size: 0.8125rem;
    margin: 0.25rem 0 0 0;
    padding: 0.375rem 0.75rem;
    background: rgba(255, 107, 107, 0.1);
    border-radius: 4px;
    border-left: 3px solid var(--color-error, #ff6b6b);
  }

  .spinner {
    display: inline-block;
    width: 12px;
    height: 12px;
    border: 2px solid rgba(255, 255, 255, 0.3);
    border-top-color: #ffffff;
    border-radius: 50%;
    animation: spin 0.7s linear infinite;
    margin-right: 0.25rem;
  }

  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }

  .empty {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    height: 100%;
    color: var(--color-text-muted, #666666);
    gap: 0.75rem;
    min-height: 300px;
  }

  .empty-icon {
    font-size: 2.5rem;
    opacity: 0.3;
  }

  .empty p {
    margin: 0;
    font-size: 0.9375rem;
    color: var(--color-text-muted, #555555);
  }

  .add-to-graph-btn {
    background: #313244;
    border: 1px solid #45475a;
    border-radius: 6px;
    padding: 6px 14px;
    font-size: 13px;
    color: #cdd6f4;
    cursor: pointer;
    transition: background 0.15s;
  }
  .add-to-graph-btn:hover:not(:disabled) {
    background: #45475a;
  }
  .add-to-graph-btn:disabled {
    color: #a6e3a1;
    border-color: #a6e3a1;
    cursor: default;
    opacity: 0.8;
  }
</style>
