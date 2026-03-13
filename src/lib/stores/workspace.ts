import { writable, derived } from 'svelte/store'
import type { Workspace } from '../types/workspace'
import { 
  loadWorkspace as loadWorkspaceFromBackend,
} from '../services/workspace'
import {
  checkWorkspaceNeedsMigration,
  migrateWorkspaceToAnya
} from '../services/workspace-migration'

export const workspace = writable<Workspace | null>(null)

export const hasWorkspace = derived(workspace, ($workspace) => $workspace !== null)

export async function initializeWorkspace() {
  try {
    const ws = await loadWorkspaceFromBackend()
    
    // Perform migration if needed
    if (ws && (await checkWorkspaceNeedsMigration(ws.path))) {
      console.log(`[migration] Migrating workspace "${ws.name}" to .anya folder structure...`)
      await migrateWorkspaceToAnya(ws.path)
      console.log(`[migration] Workspace migration completed`)
    }
    
    workspace.set(ws)
  } catch (error) {
    console.error('Failed to load workspace from backend:', error)
    workspace.set(null)
  }
}
