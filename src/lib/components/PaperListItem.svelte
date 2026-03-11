<script lang="ts">
  import type { Paper } from '../types/paper'

  interface Props {
    paper: Paper
    isSelected: boolean
    onClick: () => void
  }

  let { paper, isSelected, onClick }: Props = $props()

  const authorList = paper.authors.slice(0, 3).join(', ')
  const moreAuthors = paper.authors.length > 3 ? `+${paper.authors.length - 3}` : ''

  const sourceLabel: Record<string, string> = {
    arxiv: 'arXiv',
    semantic_scholar: 'Semantic Scholar',
    local: 'Local',
  }
</script>

<button class="paper-item" class:selected={isSelected} onclick={onClick} type="button">
  <div class="title">{paper.title}</div>
  <div class="authors">
    {authorList || 'Unknown authors'}
    {#if moreAuthors}
      <span class="more">{moreAuthors}</span>
    {/if}
  </div>
  <div class="meta">
    <span class="source">{sourceLabel[paper.source] ?? paper.source}</span>
    {#if paper.year}
      <span class="year">{paper.year}</span>
    {/if}
    {#if paper.isOpenAccess}
      <span class="badge oa">OA</span>
    {/if}
    {#if !paper.pdfUrl && !paper.localPdfPath}
      <span class="badge paywall">Paywall</span>
    {/if}
  </div>
</button>

<style>
  .paper-item {
    width: 100%;
    padding: 0.625rem 1rem;
    border: none;
    background: transparent;
    cursor: pointer;
    text-align: left;
    border-bottom: 1px solid var(--color-border, #2a2a2a);
    transition: background-color 0.1s;
    display: block;
  }

  .paper-item:hover {
    background-color: rgba(255, 255, 255, 0.04);
  }

  .paper-item.selected {
    background-color: rgba(107, 156, 255, 0.1);
    border-left: 2px solid var(--color-accent, #6b9cff);
    padding-left: calc(1rem - 2px);
  }

  .title {
    font-weight: 600;
    font-size: 0.8125rem;
    color: var(--color-text, #f0f0f0);
    margin-bottom: 0.25rem;
    line-height: 1.35;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }

  .authors {
    font-size: 0.75rem;
    color: var(--color-text-muted, #666666);
    margin-bottom: 0.25rem;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .more {
    font-style: italic;
    margin-left: 0.25rem;
  }

  .meta {
    font-size: 0.6875rem;
    color: var(--color-text-muted, #666666);
    display: flex;
    gap: 0.375rem;
    align-items: center;
  }

  .source {
    font-weight: 500;
    color: var(--color-text-secondary, #aaaaaa);
  }

  .badge {
    padding: 0.0625rem 0.3125rem;
    border-radius: 0.1875rem;
    font-size: 0.625rem;
    font-weight: 700;
    letter-spacing: 0.03em;
    text-transform: uppercase;
  }

  .badge.oa {
    background-color: rgba(34, 197, 94, 0.15);
    color: #4ade80;
  }

  .badge.paywall {
    background-color: rgba(239, 68, 68, 0.12);
    color: #f87171;
  }
</style>
