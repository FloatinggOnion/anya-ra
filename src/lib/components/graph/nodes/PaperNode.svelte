<script lang="ts">
  import { Handle, Position } from '@xyflow/svelte'
  import type { NodeProps, Node } from '@xyflow/svelte'
  import type { PaperNodeData } from '../../../types/graph'
  import { selectedPaperId } from '../../../stores/papers'

  // selectedPaperId imported for future double-click navigation (Wave 4)
  void selectedPaperId

  let { data }: NodeProps<Node<PaperNodeData & Record<string, unknown>>> = $props()
  const nodeData = $derived(data as PaperNodeData)

  const firstAuthor = $derived(
    nodeData.authors[0]
      ? nodeData.authors[0].split(',')[0].trim().slice(0, 20) +
          (nodeData.authors[0].length > 20 ? '…' : '')
      : ''
  )
  const authorLine = $derived(
    firstAuthor + (nodeData.authors.length > 1 ? ' et al.' : '') + (nodeData.year ? ` · ${nodeData.year}` : '')
  )
</script>

<div class="paper-node">
  <Handle type="target" position={Position.Top} />
  <div class="badge">📄 Paper</div>
  <div class="title">{nodeData.title}</div>
  {#if authorLine}
    <div class="meta">{authorLine}</div>
  {/if}
  <Handle type="source" position={Position.Bottom} />
</div>

<style>
  .paper-node {
    background: var(--color-surface-2, #1e1e2e);
    border: 1.5px solid var(--color-border-strong, #45475a);
    border-radius: 8px;
    padding: 10px 14px;
    min-width: 160px;
    max-width: 240px;
    cursor: default;
    font-family: inherit;
  }
  .badge {
    font-size: 10px;
    font-weight: 600;
    color: var(--color-text-muted, #6c7086);
    text-transform: uppercase;
    letter-spacing: 0.05em;
    margin-bottom: 4px;
  }
  .title {
    font-size: 13px;
    font-weight: 600;
    color: var(--color-text-primary, #cdd6f4);
    line-height: 1.35;
    display: -webkit-box;
    -webkit-line-clamp: 3;
    line-clamp: 3;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }
  .meta {
    font-size: 11px;
    color: var(--color-text-muted, #6c7086);
    margin-top: 4px;
  }
</style>
