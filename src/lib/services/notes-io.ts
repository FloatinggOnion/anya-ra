/**
 * Notes I/O service — invoke Rust commands via Tauri.
 * Handles load/save to {workspace}/notes/{paperId}.json
 */

import { invoke } from '@tauri-apps/api/core'
import type { NotesSidecar } from '../types/notes'

/**
 * Load a single note from disk.
 * Returns null if file doesn't exist (new note).
 * Throws on read error (permission, corrupt JSON).
 */
export async function loadNotes(
  workspacePath: string,
  paperId: string
): Promise<NotesSidecar | null> {
  try {
    const content = await invoke<string>('load_notes', {
      workspacePath,
      paperId,
    })
    return JSON.parse(content) as NotesSidecar
  } catch (error: unknown) {
    if (error instanceof Error && error.message.includes('not found')) {
      return null
    }
    console.error(`[notes-io] Load failed for ${paperId}:`, error)
    return null
  }
}

/**
 * Save a note to disk.
 * Creates {workspace}/notes/ directory if missing.
 * Overwrites existing file.
 * Throws on write error.
 */
export async function saveNotes(
  workspacePath: string,
  paperId: string,
  sidecar: NotesSidecar
): Promise<void> {
  try {
    const content = JSON.stringify(sidecar, null, 2)
    await invoke<void>('save_notes', {
      workspacePath,
      paperId,
      content,
    })
  } catch (error) {
    console.error(`[notes-io] Save failed for ${paperId}:`, error)
    throw error
  }
}
