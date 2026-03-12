// Module-level stable references — imported by GraphCanvas.svelte
// DO NOT move these into a component <script> block.
import PaperNode from './nodes/PaperNode.svelte'
import ConceptNode from './nodes/ConceptNode.svelte'
import NoteNode from './nodes/NoteNode.svelte'
import TypedEdge from './edges/TypedEdge.svelte'
import type { NodeTypes, EdgeTypes } from '@xyflow/svelte'

// Type cast needed because NodeProps<T> is stricter than the generic NodeTypes record
// but SvelteFlow will call these components correctly at runtime.
export const nodeTypes = {
  paper: PaperNode,
  concept: ConceptNode,
  note: NoteNode,
} as unknown as NodeTypes

export const edgeTypes = {
  typed: TypedEdge,
} as unknown as EdgeTypes
