import { writable, get } from 'svelte/store'
import { workspace } from './workspace'
import { papers } from './papers'
import { loadGraph, saveGraph } from '../services/graph'
import { loadNotes } from '../services/notes-io'
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
      console.debug('[graph] Graph persisted successfully', {
        nodeCount: nodes.length,
        edgeCount: edges.length,
        nodePositions: nodes.map(n => ({ id: n.id, pos: n.position })),
        viewport,
      })
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

  console.debug('[graph] Graph initialized', {
    nodeCount: validNodes.length,
    edgeCount: validEdges.length,
    nodePositions: validNodes.map(n => ({ id: n.id, pos: n.position })),
    viewport: file.viewport,
  })
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

/**
 * Add a paper to the graph, and automatically include its note (if one exists)
 * as a linked node. This is the preferred entry point over ensurePaperNode directly.
 */
export async function addPaperToGraph(paper: Paper): Promise<void> {
  ensurePaperNode(paper)

  const ws = get(workspace)
  if (ws?.path) {
    const sidecar = await loadNotes(ws.path, paper.id)
    const content = sidecar?.notes[0]?.content?.trim()
    if (content) {
      ensureNoteNodeForPaper(paper.id, content)
    }
  }

  persistGraph(get(graphViewport))
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
 * If it already exists, update its body. If not, create it positioned
 * below the paper node and linked to it with an edge.
 */
export function ensureNoteNodeForPaper(paperId: string, body: string): string {
  let existingNoteId: string | null = null
  let paperNodePos: { x: number; y: number } | null = null

  graphNodes.update((nodes) => {
    const paperNode = nodes.find(
      (n) => n.data.kind === 'paper' && (n.data as { kind: string; paperId: string }).paperId === paperId
    )
    if (paperNode) paperNodePos = paperNode.position

    const existing = nodes.find(
      (n) => n.data.kind === 'note' && (n.data as any).paperId === paperId
    )
    if (existing) {
      existingNoteId = existing.id
      return nodes.map((n) =>
        n.id === existing.id
          ? { ...n, data: { ...(n.data as any), body } }
          : n
      )
    }
    return nodes
  })

  if (existingNoteId) return existingNoteId

  // Position note below-right of the paper node
  const pos = paperNodePos as { x: number; y: number } | null
  const position = pos
    ? { x: pos.x + 60, y: pos.y + 220 }
    : { x: 400, y: 300 }

  const noteId = addNoteNode(body, position, { paperId })

  // Link note to its paper with a 'related' edge
  const paperNodeId = `paper-${paperId}`
  graphEdges.update((edges) => {
    const alreadyLinked = edges.some((e) => e.source === paperNodeId && e.target === noteId)
    if (alreadyLinked) return edges
    return [
      ...edges,
      {
        id: `edge-${paperNodeId}-${noteId}`,
        source: paperNodeId,
        target: noteId,
        type: 'typed',
        data: { type: 'related' },
      } as GraphEdge,
    ]
  })

  return noteId
}

/**
 * Delete note node for a paper from the graph.
 */
export function deleteNoteNodeForPaper(paperId: string): void {
  graphNodes.update((nodes) =>
    nodes.filter((n) => !(n.data.kind === 'note' && (n.data as any).paperId === paperId))
  )
}
