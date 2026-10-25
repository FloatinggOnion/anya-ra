<script lang="ts">
  import Icon from '../Icon.svelte'
  import { onMount } from 'svelte'
  import { SvelteFlow, Background, Controls, MiniMap, Panel, addEdge, type Connection, type NodeTypes } from '@xyflow/svelte'
  import '@xyflow/svelte/dist/style.css'
  import { get } from 'svelte/store'
  import { graphNodes, graphEdges, graphViewport, graphFitOnInit, persistGraph } from '../../stores/graph'
  import { canvasSelection, openCanvasObject } from '../../stores/spatial'
  import { effectiveTheme } from '../../stores/theme'
  import type { GraphNode, GraphEdge, AnyaEdgeType } from '../../types/graph'
  import SpatialNode from './SpatialNode.svelte'
  import FlowController from '../graph/FlowController.svelte'
  import { edgeTypes } from '../graph/nodeTypes'
  import type { useSvelteFlow } from '@xyflow/svelte'

  let { oncreate, onlibrary }: { oncreate: (kind: 'question' | 'note') => void; onlibrary: () => void } = $props()
  const nodeTypes = Object.fromEntries(['paper', 'concept', 'note', 'document', 'chat', 'search'].map(kind => [kind, SpatialNode])) as NodeTypes
  let nodes = $state.raw<GraphNode[]>(get(graphNodes))
  let edges = $state.raw<GraphEdge[]>(get(graphEdges))
  let flow = $state.raw<ReturnType<typeof useSvelteFlow> | null>(null)
  let relation = $state<AnyaEdgeType>('related')
  let ready = $state(false)
  onMount(() => {
    const unsubNodes = graphNodes.subscribe(value => { nodes = value })
    const unsubEdges = graphEdges.subscribe(value => { edges = value })
    ready = true
    return () => { unsubNodes(); unsubEdges(); canvasSelection.set([]) }
  })
  function savePositions() {
    if (!flow) return
    graphNodes.set(flow.getNodes() as GraphNode[])
    persistGraph(flow.getViewport())
  }
  function connect(connection: Connection) {
    if (connection.source === connection.target || edges.some(e => e.source === connection.source && e.target === connection.target)) return
    graphEdges.set(addEdge({ ...connection, type: 'typed', data: { type: relation } }, edges) as GraphEdge[])
    persistGraph(get(graphViewport))
  }
  function deleted({ nodes: removed, edges: removedEdges }: { nodes: GraphNode[]; edges: GraphEdge[] }) {
    const ids = new Set(removed.map(n => n.id))
    const edgeIds = new Set(removedEdges.map(e => e.id))
    graphNodes.update(ns => ns.filter(n => !ids.has(n.id)))
    graphEdges.update(es => es.filter(e => !edgeIds.has(e.id) && !ids.has(e.source) && !ids.has(e.target)))
    persistGraph(get(graphViewport))
  }
</script>

<div class="thinking-canvas">
  {#if ready}
    <SvelteFlow {nodes} {edges} {nodeTypes} {edgeTypes} colorMode={$effectiveTheme}
      initialViewport={$graphViewport} fitView={$graphFitOnInit} minZoom={0.15} maxZoom={2}
      onconnect={connect} ondelete={deleted} onnodedragstop={savePositions}
      onmoveend={(_, viewport) => persistGraph(viewport)}
      onselectionchange={({ nodes: selected }) => canvasSelection.set(selected.map(n => n.id))}
      onnodeclick={({ node, event }) => { if (event instanceof MouseEvent && event.detail === 2) openCanvasObject(node.id) }}
      isValidConnection={(edge) => edge.source !== edge.target && !edges.some(e => e.source === edge.source && e.target === edge.target)}
      deleteKey={['Backspace', 'Delete']} proOptions={{ hideAttribution: true }}>
      <FlowController onready={value => { flow = value }} />
      <Background gap={24} size={1} patternColor="var(--color-canvas-dot)" />
      <Controls showLock={false} />
      <MiniMap pannable zoomable nodeColor="var(--color-border-strong)" maskColor="var(--color-shadow)" />
      <Panel position="top-left">
        <div class="canvas-caption"><span>Thinking space</span><small>{nodes.length} objects · {edges.length} connections</small></div>
      </Panel>
      <Panel position="bottom-center">
        <label class="relation">Connect as <select bind:value={relation} aria-label="Relationship for new connections"><option value="related">Related</option><option value="supports">Supports</option><option value="contradicts">Contradicts</option><option value="cites">Cites</option></select></label>
      </Panel>
    </SvelteFlow>
  {/if}
  {#if nodes.length === 0}
    <div class="canvas-empty">
      <span class="empty-mark"><Icon name="think" size={36} /></span>
      <h1>Where could this lead?</h1>
      <p>Begin with a question. Bring in research, trace connections, and give a new idea room to develop.</p>
      <div class="empty-actions"><button class="primary" onclick={() => oncreate('question')}>Start with a question</button><button onclick={onlibrary}>Bring in research</button></div>
      <small>Drag to explore · Scroll to zoom · Connect the handles on objects</small>
    </div>
  {/if}
</div>

<style>
  .thinking-canvas { height: 100%; width: 100%; position: relative; isolation: isolate; }
  .canvas-caption { padding: var(--space-sm); display: flex; flex-direction: column; gap: var(--space-xs); color: var(--color-text-secondary); pointer-events: none; }
  .canvas-caption span { font-size: var(--text-sm); } small { color: var(--color-text-muted); font-size: var(--text-xs); }
  .canvas-empty { position: absolute; top: 45%; left: 50%; transform: translate(-50%, -50%); width: min(460px, 85%); pointer-events: none; }
  .empty-mark { color: var(--color-accent); font-family: var(--font-display); font-size: 44px; }
  h1 { font-family: var(--font-display); font-size: var(--text-display); font-weight: 400; line-height: 1.15; margin: 12px 0 20px; }
  p { color: var(--color-text-secondary); font-size: var(--text-md); line-height: 1.8; margin: 0 0 24px; }
  .empty-actions { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 24px; pointer-events: auto; }
  button, select { border: 1px solid var(--color-border); border-radius: var(--radius-input); background: var(--color-surface); color: var(--color-text); padding: 10px 14px; cursor: pointer; font-size: var(--text-sm); }
  button:hover { background: var(--color-surface-2); }
  .primary { background: var(--color-accent); color: var(--color-on-accent); border-color: var(--color-accent); }
  .primary:hover { background: var(--color-accent-hover); }
  .relation { display: flex; align-items: center; gap: 8px; padding: 4px 8px; border: 1px solid var(--color-border); border-radius: var(--radius-input); background: var(--color-surface); color: var(--color-text-secondary); font-size: var(--text-xs); }
  select { border: 0; padding: 6px; }
  :global(.thinking-canvas .svelte-flow) { background: var(--color-bg); }
  :global(.thinking-canvas .svelte-flow__controls-button) { background: var(--color-surface); border-color: var(--color-border); fill: var(--color-text); }
  :global(.thinking-canvas .svelte-flow__edge-path) { stroke: var(--color-border-strong); stroke-width: 1.5; }
  :global(.thinking-canvas .svelte-flow__minimap) { background: var(--color-surface); border: 1px solid var(--color-border); border-radius: var(--radius-input); }
  @media (max-width: 800px) { :global(.thinking-canvas .svelte-flow__minimap) { display: none; } }
</style>
