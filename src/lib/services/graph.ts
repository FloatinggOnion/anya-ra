import { invoke } from '@tauri-apps/api/core'
import type { GraphFile } from '../types/graph'

/**
 * Load graph.json from the workspace.
 * Returns null if the file doesn't exist yet (first run).
 */
export async function loadGraph(workspacePath: string): Promise<GraphFile | null> {
  const json = await invoke<string | null>('load_graph_file', { workspacePath })
  if (!json) return null
  const parsed = JSON.parse(json) as GraphFile
  if (parsed.version !== 1) {
    throw new Error('This canvas uses an unsupported file version.')
  }
  if (!Array.isArray(parsed.nodes) || !Array.isArray(parsed.edges)) throw new Error('The saved canvas could not be read.')
  return parsed
}

/**
 * Save the current graph state to graph.json in the workspace.
 */
export async function saveGraph(workspacePath: string, graphFile: GraphFile): Promise<void> {
  const content = JSON.stringify(graphFile, null, 2)
  await invoke<void>('save_graph_file', { workspacePath, content })
}
