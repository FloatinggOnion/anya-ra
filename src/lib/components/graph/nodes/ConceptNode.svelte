<script lang="ts">
  import { Handle, Position } from '@xyflow/svelte'
  import type { NodeProps, Node } from '@xyflow/svelte'
  import type { ConceptNodeData } from '../../../types/graph'

  let { data }: NodeProps<Node<ConceptNodeData & Record<string, unknown>>> = $props()
  const nodeData = $derived(data as ConceptNodeData)
</script>

<div class="concept-node" style={nodeData.color ? `--accent: ${nodeData.color}` : ''}>
  <Handle type="target" position={Position.Top} />
  <div class="badge">💡 Concept</div>
  <div class="label">{nodeData.label}</div>
  {#if nodeData.body}
    <div class="body">{nodeData.body}</div>
  {/if}
  <div class="edit-hint">↗ Double-click to edit</div>
  <Handle type="source" position={Position.Bottom} />
</div>

<style>
  .concept-node {
    background: var(--color-surface-2, #1e1e2e);
    border: 1.5px solid var(--accent, #89b4fa);
    border-radius: 10px;
    padding: 10px 14px;
    min-width: 140px;
    max-width: 220px;
  }
  .badge {
    font-size: 10px;
    font-weight: 600;
    color: var(--accent, #89b4fa);
    text-transform: uppercase;
    letter-spacing: 0.05em;
    margin-bottom: 4px;
  }
  .label {
    font-size: 14px;
    font-weight: 700;
    color: var(--color-text-primary, #cdd6f4);
  }
  .body {
    font-size: 12px;
    color: var(--color-text-secondary, #a6adc8);
    margin-top: 5px;
    line-height: 1.4;
    display: -webkit-box;
    -webkit-line-clamp: 3;
    line-clamp: 3;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }
  .edit-hint {
    font-size: 10px;
    color: #6c7086;
    margin-top: 6px;
    opacity: 0;
    transition: opacity 0.15s;
  }
  .concept-node:hover .edit-hint {
    opacity: 1;
  }
</style>
