import { writable, derived } from 'svelte/store'
import type { Workspace } from '../types/workspace'
import { loadWorkspace as loadWorkspaceFromBackend } from '../services/workspace'

export const workspace = writable<Workspace | null>(null)

export const hasWorkspace = derived(workspace, ($workspace) => $workspace !== null)

export async function initializeWorkspace() {
  try {
    const ws = await loadWorkspaceFromBackend()
    workspace.set(ws)
  } catch (error) {
    console.error('Failed to load workspace from backend:', error)
    workspace.set(null)
  }
}
