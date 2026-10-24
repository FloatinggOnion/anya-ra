import { writable } from 'svelte/store'
import type { ResearchProposal } from '../services/socratic'

export type FocusTool = 'object' | 'papers' | 'pdf' | 'notes' | 'document' | 'chat' | 'companion' | 'search'
export const focusedNodeId = writable<string | null>(null)
export const focusTool = writable<FocusTool | null>(null)
export const canvasSelection = writable<string[]>([])
export const researchGoal = writable('')
export const researchProposals = writable<ResearchProposal[]>([])
export const acceptedProposals = writable<Record<string, string>>({})

export function openCanvasObject(id: string) {
  focusedNodeId.set(id)
  focusTool.set('object')
}
