<script lang="ts">
  import { searchQuery, sourceFilter, addPaper } from '../stores/papers'
  import { searchArxiv, searchSemanticScholar, savePaper, importLocalPdf } from '../services/papers'
  import { workspace } from '../stores/workspace'
  import type { Paper } from '../types/paper'

  let query = $state('')
  let isSearching = $state(false)
  let errorMessage = $state<string | null>(null)

  async function handleSearch(source: 'arxiv' | 'semantic_scholar') {
    if (!query.trim() || !$workspace) return

    isSearching = true
    errorMessage = null

    try {
      let results: Paper[]

      if (source === 'arxiv') {
        results = await searchArxiv(query, { maxResults: 20 })
      } else {
        results = await searchSemanticScholar(query, { maxResults: 20 })
      }

      // Add results to store and persist each to disk
      for (const paper of results) {
        addPaper(paper)
        await savePaper($workspace.path, paper)
      }

      console.log(`Found ${results.length} papers from ${source}`)
    } catch (error) {
      errorMessage = error instanceof Error ? error.message : 'Search failed'
      console.error('Search error:', error)
    } finally {
      isSearching = false
    }
  }

  async function handleImportLocal() {
    if (!$workspace) return

    isSearching = true
    errorMessage = null

    try {
      const paper = await importLocalPdf($workspace.path)
      addPaper(paper)
      // importLocalPdf already saves metadata via Rust command
      console.log('Imported local PDF:', paper.title)
    } catch (error) {
      if (error instanceof Error && error.message === 'No file selected') {
        // User cancelled — not an error
        return
      }
      errorMessage = error instanceof Error ? error.message : 'Import failed'
      console.error('Import error:', error)
    } finally {
      isSearching = false
    }
  }

  function handleQueryInput() {
    searchQuery.set(query)
  }

  function handleKeyDown(e: KeyboardEvent) {
    if (e.key === 'Enter' && query.trim()) {
      handleSearch('arxiv')
    }
  }
</script>

<div class="search-bar">
  <div class="search-input-row">
    <input
      type="text"
      bind:value={query}
      oninput={handleQueryInput}
      onkeydown={handleKeyDown}
      placeholder="Search papers…"
      disabled={isSearching}
      aria-label="Paper search query"
    />
  </div>

  <div class="search-actions">
    <button
      onclick={() => handleSearch('arxiv')}
      disabled={isSearching || !query.trim()}
      class="search-btn arxiv"
      title="Search arXiv (Enter)"
    >
      {isSearching ? '…' : 'arXiv'}
    </button>
    <button
      onclick={() => handleSearch('semantic_scholar')}
      disabled={isSearching || !query.trim()}
      class="search-btn semantic"
      title="Search Semantic Scholar"
    >
      {isSearching ? '…' : 'S2'}
    </button>
    <button
      onclick={handleImportLocal}
      disabled={isSearching}
      class="search-btn local"
      title="Import a local PDF file"
    >
      + PDF
    </button>
  </div>

  <div class="filters" role="radiogroup" aria-label="Filter by source">
    <label class="filter-label">
      <input type="radio" bind:group={$sourceFilter} value="all" />
      All
    </label>
    <label class="filter-label">
      <input type="radio" bind:group={$sourceFilter} value="arxiv" />
      arXiv
    </label>
    <label class="filter-label">
      <input type="radio" bind:group={$sourceFilter} value="semantic_scholar" />
      S2
    </label>
    <label class="filter-label">
      <input type="radio" bind:group={$sourceFilter} value="local" />
      Local
    </label>
  </div>

  {#if errorMessage}
    <div class="error" role="alert">{errorMessage}</div>
  {/if}
</div>

<style>
  .search-bar {
    padding: 0.75rem;
    border-bottom: 1px solid var(--color-border, #2a2a2a);
    background: var(--color-surface, #1a1a1a);
    flex-shrink: 0;
  }

  .search-input-row {
    margin-bottom: 0.5rem;
  }

  input[type='text'] {
    width: 100%;
    padding: 0.4375rem 0.625rem;
    background: var(--color-bg, #0f0f0f);
    border: 1px solid var(--color-border, #2a2a2a);
    border-radius: 0.25rem;
    color: var(--color-text, #f0f0f0);
    font-size: 0.875rem;
    box-sizing: border-box;
    transition: border-color 0.15s;
  }

  input[type='text']:focus {
    outline: none;
    border-color: var(--color-accent, #6b9cff);
  }

  input[type='text']:disabled {
    opacity: 0.6;
  }

  .search-actions {
    display: flex;
    gap: 0.375rem;
    margin-bottom: 0.5rem;
  }

  .search-btn {
    flex: 1;
    padding: 0.375rem 0.5rem;
    border: 1px solid var(--color-border, #2a2a2a);
    border-radius: 0.25rem;
    background: var(--color-bg, #0f0f0f);
    color: var(--color-text-secondary, #aaaaaa);
    cursor: pointer;
    font-size: 0.8125rem;
    font-weight: 500;
    transition: background 0.1s, color 0.1s;
  }

  .search-btn:hover:not(:disabled) {
    background: rgba(107, 156, 255, 0.1);
    color: var(--color-accent, #6b9cff);
    border-color: rgba(107, 156, 255, 0.3);
  }

  .search-btn:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }

  .search-btn.local {
    flex: 0 0 auto;
    padding: 0.375rem 0.625rem;
  }

  .filters {
    display: flex;
    gap: 0.625rem;
    font-size: 0.75rem;
    color: var(--color-text-muted, #666666);
  }

  .filter-label {
    display: flex;
    align-items: center;
    gap: 0.25rem;
    cursor: pointer;
  }

  .filter-label input[type='radio'] {
    accent-color: var(--color-accent, #6b9cff);
  }

  .error {
    margin-top: 0.5rem;
    padding: 0.4375rem 0.625rem;
    background: rgba(239, 68, 68, 0.08);
    border: 1px solid rgba(239, 68, 68, 0.25);
    border-radius: 0.25rem;
    color: #f87171;
    font-size: 0.8125rem;
    line-height: 1.4;
  }
</style>
