<script lang="ts">
  import { BaseEdge, EdgeLabel, getBezierPath } from '@xyflow/svelte'
  import type { EdgeProps, Edge } from '@xyflow/svelte'
  import type { AnyaEdgeData, AnyaEdgeType } from '../../../types/graph'

  let {
    id,
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
    data,
    markerEnd,
    style = '',
  }: EdgeProps<Edge<AnyaEdgeData & Record<string, unknown>>> = $props()

  const [edgePath, labelX, labelY] = $derived(
    getBezierPath({ sourceX, sourceY, sourcePosition, targetX, targetY, targetPosition })
  )

  const relationColors: Record<AnyaEdgeType, string> = {
    related: '#6c7086',
    supports: '#a6e3a1',
    contradicts: '#f38ba8',
    cites: '#89b4fa',
  }

  const edgeData = $derived(data as AnyaEdgeData | undefined)
  const labelText = $derived(edgeData?.label ?? edgeData?.type ?? 'related')
  const labelColor = $derived(relationColors[edgeData?.type ?? 'related'])
</script>

<BaseEdge {id} path={edgePath} {markerEnd} {style} />

<EdgeLabel x={labelX} y={labelY}>
  <div class="edge-label" style="color: {labelColor}">
    {labelText}
  </div>
</EdgeLabel>

<style>
  .edge-label {
    position: absolute;
    font-size: 10px;
    font-weight: 600;
    background: #1e1e2e;
    padding: 2px 6px;
    border-radius: 4px;
    border: 1px solid #313244;
    pointer-events: none;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    white-space: nowrap;
  }
</style>
