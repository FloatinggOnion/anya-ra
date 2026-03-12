<script lang="ts">
  import { Handle, Position } from '@xyflow/svelte'
  import type { NodeProps, Node } from '@xyflow/svelte'
  import type { NoteNodeData } from '../../../types/graph'

  let { data }: NodeProps<Node<NoteNodeData & Record<string, unknown>>> = $props()
  const nodeData = $derived(data as NoteNodeData)
</script>

<div class="note-node" style={nodeData.color ? `background: ${nodeData.color}` : ''}>
  <Handle type="target" position={Position.Top} />
  <div class="badge">📝 Note</div>
  <div class="body">{nodeData.excerpt}</div>
  <Handle type="source" position={Position.Bottom} />
</div>

<style>
  .note-node {
    background: #313244;
    border: 1px solid #585b70;
    border-radius: 6px;
    padding: 10px 12px;
    min-width: 130px;
    max-width: 200px;
  }
  .badge {
    font-size: 10px;
    font-weight: 600;
    color: #f9e2af;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    margin-bottom: 4px;
  }
  .body {
    font-size: 12px;
    color: #cdd6f4;
    line-height: 1.45;
    white-space: pre-wrap;
    display: -webkit-box;
    -webkit-line-clamp: 5;
    line-clamp: 5;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }
</style>
