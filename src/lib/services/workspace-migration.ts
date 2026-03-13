/**
 * Workspace migration utility
 * Handles moving workspace data from root folder to .anya/ subfolder
 */

import { invoke } from '@tauri-apps/api/core'

/**
 * Migrate workspace from root folder to .anya/ subfolder
 * - Creates .anya/ folder if it doesn't exist
 * - Moves papers/ folder to .anya/papers/
 * - Moves notes/ folder to .anya/notes/
 * - Moves graph.json to .anya/graph.json
 * - Cleans up old folders
 */
export async function migrateWorkspaceToAnya(workspacePath: string): Promise<void> {
  return invoke<void>('migrate_workspace_to_anya', { workspacePath })
}

/**
 * Check if workspace needs migration (has data in root instead of .anya/)
 */
export async function checkWorkspaceNeedsMigration(workspacePath: string): Promise<boolean> {
  return invoke<boolean>('check_workspace_needs_migration', { workspacePath })
}
