<script lang="ts">
  import {
    SvelteFlow,
    Background,
    Controls,
    MiniMap,
    Panel,
    addEdge,
    type Connection,
    type IsValidConnection,
  } from '@xyflow/svelte'
  import type { Edge } from '@xyflow/svelte'
  import '@xyflow/svelte/dist/style.css'
  import { nodeTypes, edgeTypes } from './nodeTypes'
  import FlowController from './FlowController.svelte'
  import GraphToolbar from './GraphToolbar.svelte'
  import NodeEditor from './NodeEditor.svelte'
  import {
    graphNodes,
    graphEdges,
    graphViewport,
    graphFitOnInit,
    persistGraph,
    addConceptNode,
    addNoteNode,
  } from '../../stores/graph'
  import { selectedPaperId } from '../../stores/papers'
  import type { GraphNode, GraphEdge } from '../../types/graph'
  import { useSvelteFlow } from '@xyflow/svelte'

  // MUST be $state.raw — $state() causes infinite re-renders with SvelteFlow
  let nodes = $state.raw<GraphNode[]>([])
  let edges = $state.raw<GraphEdge[]>([])

  $effect(() => { nodes = $graphNodes })
  $effect(() => { edges = $graphEdges })

  let flowInstance = $state.raw<ReturnType<typeof useSvelteFlow> | null>(null)
  let editorMode = $state<'concept' | 'note' | null>(null)

  function onconnect(connection: Connection) {
    const isDuplicate = edges.some(
      (e) => e.source === connection.source && e.target === connection.target
    )
    if (isDuplicate) return
    edges = addEdge(
      { ...connection, type: 'typed', data: { type: 'related' } },
      edges
    ) as GraphEdge[]
    graphEdges.set(edges)
    _persist()
  }

  // Sync deletions back to stores (SvelteFlow has already removed them from local arrays)
  function ondelete({ nodes: deleted, edges: deletedEdges }: { nodes: GraphNode[]; edges: GraphEdge[] }) {
    const removedNodeIds = new Set(deleted.map((n) => n.id))
    const removedEdgeIds = new Set(deletedEdges.map((e) => e.id))
    graphNodes.update((ns) => ns.filter((n) => !removedNodeIds.has(n.id)))
    graphEdges.update((es) => es.filter((e) => !removedEdgeIds.has(e.id)))
    _persist()
  }

  // Persist node positions after drag (SvelteFlow mutates node.position in place)
  function onnodedragstop() {
    graphNodes.set(nodes)
    _persist()
  }

  function _persist() {
    if (!flowInstance) return
    try {
      const { viewport } = flowInstance.toObject()
      persistGraph(viewport)
    } catch {
      persistGraph({ x: 0, y: 0, zoom: 1 })
    }
  }

  // Single-click on paper node selects it in the sidebar
  function onnodeclick({ node }: { node: GraphNode }) {
    if (node.data.kind === 'paper') {
      selectedPaperId.set((node.data as { kind: 'paper'; paperId: string }).paperId)
    }
  }

  function handleFitView() {
    if (!flowInstance) return
    flowInstance.fitView({ padding: 0.15 })
  }

  function handleAddSubmit(data: { label?: string; body: string }) {
    if (editorMode === 'concept') {
      addConceptNode(data.label ?? 'Concept', data.body)
    } else if (editorMode === 'note') {
      addNoteNode(data.body)
    }
    editorMode = null
    _persist()
  }

  const isValidConnection: IsValidConnection = (edge: Edge | Connection) => {
    return !edges.some(
      (e) => e.source === edge.source && e.target === edge.target
    )
  }
</script>

<div class="canvas-root">
  <SvelteFlow
    {nodes}
    {edges}
    {nodeTypes}
    {edgeTypes}
    colorMode="dark"
    {onconnect}
    {ondelete}
    {onnodedragstop}
    {onnodeclick}
    {isValidConnection}
    initialViewport={$graphViewport}
    fitView={$graphFitOnInit}
    deleteKey="Backspace"
    proOptions={{ hideAttribution: true }}
  >
    <FlowController onready={(f) => { flowInstance = f }} />
    <Background />
    <Controls />
    <MiniMap nodeStrokeWidth={3} zoomable pannable />
    <Panel position="top-left">
      <GraphToolbar
        onaddconcept={() => (editorMode = 'concept')}
        onaddnote={() => (editorMode = 'note')}
        onfitview={handleFitView}
      />
    </Panel>
  </SvelteFlow>
</div>

{#if editorMode}
  <NodeEditor
    mode={editorMode}
    onsubmit={handleAddSubmit}
    oncancel={() => (editorMode = null)}
  />
{/if}

<style>
  .canvas-root {
    width: 100%;
    height: 100%;
    isolation: isolate;
  }
</style>
