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
      console.debug('[graph] Graph persisted successfully', { nodeCount: nodes.length, edgeCount: edges.length })
    } catch (err) {
      console.error('[graph] Failed to persist graph:', err)
    }
  }, 1000) // Increased from 300ms to 1000ms to ensure save completes
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
  body: string,
  position?: { x: number; y: number },
  opts?: { paperId?: string; annotationId?: string }
): string {
  const id = `note-${crypto.randomUUID()}`
  graphNodes.update((nodes) => [
    ...nodes,
    {
      id,
      type: 'note',
      position: position ?? { x: 400, y: 300 },
      data: { kind: 'note', body, ...opts } as AnyNodeData & Record<string, unknown>,
    },
  ])
  return id
}

/**
 * Ensure a note node exists for a paper in the graph.
 * If it already exists, update its body. If not, create it.
 * Positions it relative to the paper node if it exists.
 */
export function ensureNoteNodeForPaper(paperId: string, body: string): string {
  let existingNoteId: string | null = null
  let paperNodeId: string | null = null

  // Find existing note node and paper node
  graphNodes.update((nodes) => {
    paperNodeId = nodes.find((n) => n.data.kind === 'paper' && (n.data as any).paperId === paperId)?.id ?? null
    const existing = nodes.find(
      (n) => n.data.kind === 'note' && (n.data as any).paperId === paperId
    )
    if (existing) {
      existingNoteId = existing.id
      // Update existing note
      return nodes.map((n) =>
        n.id === existing.id
          ? { ...n, data: { ...(n.data as any), body } }
          : n
      )
    }
    return nodes
  })

  // If note exists, return its ID
  if (existingNoteId) {
    return existingNoteId
  }

  // Otherwise, create new note node positioned below the paper node
  const position = paperNodeId
    ? { x: 100, y: 150 } // Relative offset from paper
    : { x: 400, y: 300 }

  return addNoteNode(body, position, { paperId })
}

/**
 * Delete note node for a paper from the graph.
 */
export function deleteNoteNodeForPaper(paperId: string): void {
  graphNodes.update((nodes) =>
    nodes.filter((n) => !(n.data.kind === 'note' && (n.data as any).paperId === paperId))
  )
}
