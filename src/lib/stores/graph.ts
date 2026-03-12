import { writable, get } from 'svelte/store'
import { workspace } from './workspace'
import { papers } from './papers'
import { loadGraph, saveGraph } from '../services/graph'
import type { GraphNode, GraphEdge, GraphFile, AnyNodeData, PersistedNode, PersistedEdge, AnyaEdgeData } from '../types/graph'
import type { Paper } from '../types/paper'

// ─── Core stores ─────────────────────────────────────────────────────────────

export const graphNodes = writable<GraphNode[]>([])
export const graphEdges = writable<GraphEdge[]>([])
export const graphViewport = writable<{ x: number; y: number; zoom: number }>({
  x: 0,
  y: 0,
  zoom: 1,
})
export const graphFitOnInit = writable<boolean>(true)

// ─── Persistence (debounced) ──────────────────────────────────────────────────

let _saveTimer: ReturnType<typeof setTimeout> | null = null

export function persistGraph(viewport: { x: number; y: number; zoom: number }): void {
  graphViewport.set(viewport)

  if (_saveTimer) clearTimeout(_saveTimer)
  _saveTimer = setTimeout(async () => {
    const ws = get(workspace)
    if (!ws?.path) return

    const nodes = get(graphNodes)
    const edges = get(graphEdges)

    const graphFile: GraphFile = {
      version: 1,
      nodes: nodes.map((n): PersistedNode => ({
        id: n.id,
        type: n.type as 'paper' | 'concept' | 'note',
        position: n.position,
        data: n.data as AnyNodeData,
      })),
      edges: edges.map((e): PersistedEdge => ({
        id: e.id,
        source: e.source,
        target: e.target,
        data: e.data as AnyaEdgeData,
      })),
      viewport,
    }

    try {
      await saveGraph(ws.path, graphFile)
    } catch (err) {
      console.error('[graph] Failed to persist graph:', err)
    }
  }, 300)
}

// ─── Initialization ───────────────────────────────────────────────────────────

export async function initializeGraph(): Promise<void> {
  const ws = get(workspace)
  if (!ws?.path) return

  const file = await loadGraph(ws.path)
  if (!file) {
    graphNodes.set([])
    graphEdges.set([])
    return
  }

  graphFitOnInit.set(false)

  const activePaperIds = new Set(get(papers).map((p: Paper) => p.id))

  const validNodes: GraphNode[] = file.nodes
    .filter((n: PersistedNode) => {
      if (n.type === 'paper') {
        const paperId = (n.data as { kind: string; paperId: string }).paperId
        return activePaperIds.has(paperId)
      }
      return true
    })
    .map(
      (n: PersistedNode): GraphNode =>
        ({
          id: n.id,
          type: n.type,
          position: n.position,
          data: n.data,
        }) as GraphNode
    )

  const validNodeIds = new Set(validNodes.map((n: GraphNode) => n.id))

  const validEdges: GraphEdge[] = file.edges
    .filter((e: PersistedEdge) => validNodeIds.has(e.source) && validNodeIds.has(e.target))
    .map(
      (e: PersistedEdge): GraphEdge =>
        ({
          id: e.id,
          source: e.source,
          target: e.target,
          data: e.data,
        }) as GraphEdge
    )

  graphNodes.set(validNodes)
  graphEdges.set(validEdges)
  graphViewport.set(file.viewport ?? { x: 0, y: 0, zoom: 1 })
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

export function ensurePaperNode(paper: Paper): void {
  graphNodes.update((nodes) => {
    const alreadyExists = nodes.some(
      (n) => n.type === 'paper' && (n.data as { kind: string; paperId: string }).paperId === paper.id
    )
    if (alreadyExists) return nodes

    const newNode: GraphNode = {
      id: `paper-${paper.id}`,
      type: 'paper',
      position: {
        x: 80 + Math.random() * 720,
        y: 80 + Math.random() * 520,
      },
      data: {
        kind: 'paper',
        paperId: paper.id,
        title: paper.title,
        authors: paper.authors,
        year: paper.year,
      },
    }
    return [...nodes, newNode]
  })
}

export function addConceptNode(
  label: string,
  body: string,
  position?: { x: number; y: number }
): string {
  const id = `concept-${crypto.randomUUID()}`
  graphNodes.update((nodes) => [
    ...nodes,
    {
      id,
      type: 'concept',
      position: position ?? { x: 300, y: 300 },
      data: { kind: 'concept', label, body } as AnyNodeData & Record<string, unknown>,
    },
  ])
  return id
}

export function addNoteNode(
  paperId: string,
  annotationId: string,
  excerpt: string,
  position?: { x: number; y: number }
): string {
  const id = `note-${crypto.randomUUID()}`
  graphNodes.update((nodes) => [
    ...nodes,
    {
      id,
      type: 'note',
      position: position ?? { x: 400, y: 300 },
      data: { kind: 'note', paperId, annotationId, excerpt } as AnyNodeData & Record<string, unknown>,
    },
  ])
  return id
}
