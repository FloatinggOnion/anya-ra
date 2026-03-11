import { invoke } from '@tauri-apps/api/core'
import type { Workspace } from '../types/workspace'

export async function pickFolder(): Promise<string | null> {
  return invoke<string | null>('pick_folder')
}

export async function loadWorkspace(): Promise<Workspace | null> {
  return invoke<Workspace | null>('load_workspace')
}

export async function saveWorkspace(workspace: Workspace): Promise<void> {
  return invoke<void>('save_workspace', { workspace })
}

export async function getAppDataDir(): Promise<string> {
  return invoke<string>('get_app_data_dir')
}

export async function getRecentWorkspaces(): Promise<Workspace[]> {
  try {
    const list = await invoke<Workspace[] | null>('load_recent_workspaces')
    return list ?? []
  } catch {
    return []
  }
}

export async function addToRecentWorkspaces(ws: Workspace): Promise<void> {
  try {
    await invoke<void>('add_recent_workspace', { workspace: ws })
  } catch {
    // non-fatal
  }
}

export async function createWorkspace(folderPath: string): Promise<Workspace> {
  // Handle both Unix and Windows path separators
  const parts = folderPath.replace(/\\/g, '/').split('/')
  const folderName = parts.filter(Boolean).pop() || 'Unnamed Workspace'
  const now = new Date().toISOString()

  const workspace: Workspace = {
    path: folderPath,
    name: folderName,
    createdAt: now,
    lastOpened: now,
  }

  await saveWorkspace(workspace)
  await addToRecentWorkspaces(workspace)
  return workspace
}

export async function updateLastOpened(workspace: Workspace): Promise<Workspace> {
  const updated: Workspace = {
    ...workspace,
    lastOpened: new Date().toISOString(),
  }
  await saveWorkspace(updated)
  return updated
}
