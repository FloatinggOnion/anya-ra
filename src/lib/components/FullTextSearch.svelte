<script lang="ts">
  import { searchQuery, searchResults, isSearching, setupSearch } from '../stores/search'
  import { papers } from '../stores/papers'
  import { selectedPaperId } from '../stores/papers'
  import { onMount } from 'svelte'

  let isOpen = $state(false)
  let selectedIndex = $state(-1)
  let inputElement: HTMLInputElement | undefined = $state()

  onMount(() => {
    setupSearch()

    // Cmd+K to open search
    function handleKeydown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        isOpen = true
        setTimeout(() => inputElement?.focus(), 0)
      }

      // Arrow keys to navigate results
      if (isOpen && $searchResults.length > 0) {
        if (e.key === 'ArrowDown') {
          e.preventDefault()
          selectedIndex = (selectedIndex + 1) % $searchResults.length
        } else if (e.key === 'ArrowUp') {
          e.preventDefault()
          selectedIndex = selectedIndex <= 0 ? $searchResults.length - 1 : selectedIndex - 1
        } else if (e.key === 'Enter') {
          e.preventDefault()
          const result = $searchResults[selectedIndex]
          if (result) {
            handleSelectResult(result)
          }
        }
      }

      // Esc to close
      if (e.key === 'Escape' && isOpen) {
        isOpen = false
      }
    }

    window.addEventListener('keydown', handleKeydown)
    return () => window.removeEventListener('keydown', handleKeydown)
  })

  function handleSelectResult(result: { id: string; type: string; paperId?: string }) {
    const paperId = result.type === 'paper' ? result.id : result.paperId
    if (paperId) {
      selectedPaperId.set(paperId)
    }
    isOpen = false
    searchQuery.set('')
    selectedIndex = -1
  }

  function getPaperTitle(paperId?: string) {
    if (!paperId) return 'Unknown'
    return $papers.find(p => p.id === paperId)?.title || 'Unknown'
  }
</script>

<div class="search-container">
  <button
    class="search-button"
    onclick={() => {
      isOpen = true
      setTimeout(() => inputElement?.focus(), 0)
    }}
    title="Search papers and notes (Cmd+K)"
  >
    🔍
    <span class="shortcut">⌘K</span>
  </button>

  {#if isOpen}
    <div class="search-overlay" onclick={() => (isOpen = false)}>
      <div class="search-modal" onclick={e => e.stopPropagation()}>
        <div class="search-input-wrapper">
          <span class="search-icon">🔍</span>
          <input
            type="text"
            bind:this={inputElement}
            bind:value={$searchQuery}
            placeholder="Search papers, notes, authors..."
            class="search-input"
            autocomplete="off"
          />
          {#if $isSearching}
            <span class="status">Searching...</span>
          {:else if $searchQuery && $searchResults.length === 0}
            <span class="status">No results</span>
          {:else if $searchResults.length > 0}
            <span class="status">{$searchResults.length}</span>
          {/if}
        </div>

        {#if $searchResults.length > 0}
          <div class="results-list">
            {#each $searchResults as result, index (result.id)}
              <button
                class="result-item"
                class:selected={index === selectedIndex}
                onclick={() => handleSelectResult(result)}
              >
                <span class="result-icon">
                  {result.type === 'paper' ? '📄' : '📝'}
                </span>
                <div class="result-content">
                  <div class="result-title">{result.title}</div>
                  {#if result.type === 'note'}
                    <div class="result-subtitle">
                      From: {getPaperTitle(result.paperId)}
                    </div>
                  {/if}
                </div>
                <span class="result-score">{(result.score * 100).toFixed(0)}%</span>
              </button>
            {/each}
          </div>
        {/if}

        <div class="search-footer">
          <div class="shortcuts">
            <span><span class="key">↑↓</span> Navigate</span>
            <span><span class="key">⏎</span> Select</span>
            <span><span class="key">Esc</span> Close</span>
          </div>
        </div>
      </div>
    </div>
  {/if}
</div>

<style>
  .search-container {
    position: relative;
  }

  .search-button {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 6px 10px;
    background: var(--color-surface-1);
    border: 1px solid var(--color-surface-2);
    border-radius: 4px;
    color: var(--color-text-secondary);
    font-size: 13px;
    cursor: pointer;
    transition: all 0.15s;
  }

  .search-button:hover {
    background: var(--color-surface-2);
    color: var(--color-text);
    border-color: var(--color-accent);
  }

  .shortcut {
    font-family: monospace;
    font-size: 10px;
    opacity: 0.5;
  }

  .search-overlay {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0, 0, 0, 0.5);
    display: flex;
    align-items: flex-start;
    justify-content: center;
    padding-top: 80px;
    z-index: 10000;
  }

  .search-modal {
    background: var(--color-surface-1);
    border: 1px solid var(--color-surface-2);
    border-radius: 8px;
    width: 90%;
    max-width: 600px;
    max-height: 70vh;
    display: flex;
    flex-direction: column;
    box-shadow: 0 20px 60px rgba(0, 0, 0, 0.4);
    animation: slideDown 0.15s ease-out;
  }

  @keyframes slideDown {
    from {
      transform: translateY(-10px);
      opacity: 0;
    }
    to {
      transform: translateY(0);
      opacity: 1;
    }
  }

  .search-input-wrapper {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 16px;
    border-bottom: 1px solid var(--color-surface-2);
    flex-shrink: 0;
  }

  .search-icon {
    font-size: 16px;
  }

  .search-input {
    flex: 1;
    background: transparent;
    border: none;
    color: var(--color-text);
    font-size: 15px;
    outline: none;
  }

  .search-input::placeholder {
    color: var(--color-text-muted);
  }

  .status {
    font-size: 12px;
    color: var(--color-text-muted);
    flex-shrink: 0;
  }

  .results-list {
    flex: 1;
    overflow-y: auto;
    min-height: 0;
  }

  .result-item {
    display: flex;
    gap: 12px;
    align-items: center;
    width: 100%;
    padding: 12px 16px;
    background: none;
    border: none;
    border-bottom: 1px solid var(--color-surface-2);
    color: inherit;
    cursor: pointer;
    transition: background 0.1s;
    text-align: left;
  }

  .result-item:hover,
  .result-item.selected {
    background: var(--color-surface-2);
  }

  .result-icon {
    font-size: 16px;
    flex-shrink: 0;
  }

  .result-content {
    flex: 1;
    min-width: 0;
  }

  .result-title {
    font-size: 13px;
    font-weight: 500;
    color: var(--color-text);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .result-subtitle {
    font-size: 11px;
    color: var(--color-text-muted);
    margin-top: 2px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .result-score {
    font-size: 11px;
    color: var(--color-text-secondary);
    flex-shrink: 0;
  }

  .search-footer {
    padding: 12px 16px;
    border-top: 1px solid var(--color-surface-2);
    background: var(--color-surface-0);
    flex-shrink: 0;
  }

  .shortcuts {
    display: flex;
    gap: 16px;
    font-size: 11px;
    color: var(--color-text-muted);
  }

  .key {
    background: var(--color-surface-2);
    border: 1px solid var(--color-surface-3);
    border-radius: 3px;
    padding: 2px 4px;
    font-family: monospace;
    font-weight: 500;
    margin: 0 4px;
  }
</style>
