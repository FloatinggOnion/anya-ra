import type { Node, Edge } from '@xyflow/svelte'

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
  paperId: string
  annotationId: string
  excerpt: string        // selectedText snippet
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

export interface GraphFile {
  version: 1
  nodes: GraphNode[]
  edges: GraphEdge[]
  viewport: GraphViewport
}
