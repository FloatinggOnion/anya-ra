<script lang="ts">
  import { filteredPapers, selectedPaperId } from '../stores/papers'
  import PaperListItem from './PaperListItem.svelte'
  import type { Paper } from '../types/paper'

  // Virtual scroll state
  let container: HTMLDivElement | undefined = $state()
  let containerHeight = $state(400)
  const ITEM_HEIGHT = 82 // px per paper item

  // Scroll position
  let scrollTop = $state(0)

  // Derived virtual window
  const totalHeight = $derived($filteredPapers.length * ITEM_HEIGHT)
  const startIndex = $derived(Math.max(0, Math.floor(scrollTop / ITEM_HEIGHT) - 2))
  const endIndex = $derived(
    Math.min(
      $filteredPapers.length,
      Math.ceil((scrollTop + containerHeight) / ITEM_HEIGHT) + 2
    )
  )
  const visiblePapers = $derived($filteredPapers.slice(startIndex, endIndex))
  const topOffset = $derived(startIndex * ITEM_HEIGHT)

  function handleScroll(e: Event) {
    scrollTop = (e.currentTarget as HTMLElement).scrollTop
  }

  function handleSelect(paperId: string) {
    selectedPaperId.set(paperId)
  }

  // Observe container resize
  $effect(() => {
    if (!container) return
    const ro = new ResizeObserver((entries) => {
      const entry = entries[0]
      if (entry) containerHeight = entry.contentRect.height
    })
    ro.observe(container)
    return () => ro.disconnect()
  })
</script>

<div
  class="paper-list"
  bind:this={container}
  onscroll={handleScroll}
  role="list"
  aria-label="Paper list"
>
  {#if $filteredPapers.length === 0}
    <div class="empty-state">
      <div class="empty-icon">🔬</div>
      <p>No papers yet</p>
      <p class="hint">Search arXiv or Semantic Scholar above, or import a local PDF</p>
    </div>
  {:else}
    <!-- Virtual scroll spacer -->
    <div class="virtual-scroll-inner" style="height: {totalHeight}px; position: relative;">
      <div style="position: absolute; top: {topOffset}px; width: 100%;">
        {#each visiblePapers as paper (paper.id)}
          <PaperListItem
            {paper}
            isSelected={paper.id === $selectedPaperId}
            onClick={() => handleSelect(paper.id)}
          />
        {/each}
      </div>
    </div>
  {/if}
</div>

<style>
  .paper-list {
    flex: 1;
    overflow-y: auto;
    overflow-x: hidden;
    background: var(--color-bg, #0f0f0f);
    min-height: 0;

    /* Custom scrollbar */
    scrollbar-width: thin;
    scrollbar-color: var(--color-border, #2a2a2a) transparent;
  }

  .paper-list::-webkit-scrollbar {
    width: 4px;
  }

  .paper-list::-webkit-scrollbar-thumb {
    background: var(--color-border, #2a2a2a);
    border-radius: 2px;
  }

  .virtual-scroll-inner {
    width: 100%;
  }

  .empty-state {
    padding: 2.5rem 1.5rem;
    text-align: center;
    color: var(--color-text-muted, #666666);
  }

  .empty-icon {
    font-size: 2rem;
    margin-bottom: 0.75rem;
    opacity: 0.5;
  }

  .empty-state p {
    margin: 0.25rem 0;
    font-size: 0.875rem;
  }

  .hint {
    font-size: 0.75rem !important;
    color: var(--color-text-muted, #555555) !important;
    line-height: 1.5;
  }
</style>
