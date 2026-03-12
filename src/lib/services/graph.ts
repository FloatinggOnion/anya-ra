import { invoke } from '@tauri-apps/api/core'
import type { GraphFile } from '../types/graph'

/**
 * Load graph.json from the workspace.
 * Returns null if the file doesn't exist yet (first run).
 */
export async function loadGraph(workspacePath: string): Promise<GraphFile | null> {
  try {
    const json = await invoke<string>('load_graph_file', { workspacePath })
    const parsed = JSON.parse(json) as GraphFile
    if (parsed.version !== 1) {
      console.warn('[graph] Unknown graph.json version:', parsed.version)
      return null
    }
    return parsed
  } catch {
    // File doesn't exist yet — normal on first run
    return null
  }
}

/**
 * Save the current graph state to graph.json in the workspace.
 */
export async function saveGraph(workspacePath: string, graphFile: GraphFile): Promise<void> {
  const content = JSON.stringify(graphFile, null, 2)
  await invoke<void>('save_graph_file', { workspacePath, content })
}
