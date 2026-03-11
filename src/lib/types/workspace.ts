export interface Workspace {
  path: string        // Absolute path to workspace folder
  name: string        // Display name (derived from folder name)
  createdAt: string   // ISO 8601 timestamp
  lastOpened: string  // ISO 8601 timestamp
}

export interface WorkspaceState {
  current: Workspace | null
  hasWorkspace: boolean
}
