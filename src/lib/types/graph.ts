import type { Node, Edge, XYPosition } from '@xyflow/svelte'

// ─── Node data discriminated unions ──────────────────────────────────────────

export interface PaperNodeData {
  kind: 'paper'
  paperId: string        // links to Paper.id in papers store
  title: string
  authors: string[]
  year: number | null
  color?: string
}

export interface ConceptNodeData {
  kind: 'concept'
  label: string
  body?: string          // optional longer text shown on hover/expand
  color?: string
}

export interface NoteNodeData {
  kind: 'note'
  body: string           // free-form text OR annotation excerpt
  paperId?: string       // optional — set for annotation-linked notes
  annotationId?: string  // optional — set for annotation-linked notes
  color?: string
}

export type AnyNodeData = PaperNodeData | ConceptNodeData | NoteNodeData

// ─── Typed node / edge ────────────────────────────────────────────────────────

export type GraphNode = Node<AnyNodeData & Record<string, unknown>>

export type AnyaEdgeType = 'supports' | 'contradicts' | 'related' | 'cites'

export interface AnyaEdgeData {
  type: AnyaEdgeType
  label?: string
}

export type GraphEdge = Edge<AnyaEdgeData & Record<string, unknown>>

// ─── Persistence file schema ──────────────────────────────────────────────────

export interface GraphViewport {
  x: number
  y: number
  zoom: number
}

/** Lightweight serializable node used only in graph.json */
export interface PersistedNode {
  id: string
  type: 'paper' | 'concept' | 'note'
  position: XYPosition
  data: AnyNodeData
}

/** Lightweight serializable edge used only in graph.json */
export interface PersistedEdge {
  id: string
  source: string
  target: string
  data: AnyaEdgeData
}

export interface GraphFile {
  version: 1
  nodes: PersistedNode[]
  edges: PersistedEdge[]
  viewport: GraphViewport
}
