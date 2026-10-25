/**
 * Frontend notes store — maps paperId → loaded note content.
 * 
 * Source of truth: disk files at {workspace}/notes/{paperId}.json
 * Pattern: writable store with debounced persistence via notes-io service
 */

import { writable, derived, get } from 'svelte/store'
import { selectedPaperId } from './papers'
import { saveNotes } from '../services/notes-io'
import type { NotesSidecar } from '../types/notes'

// Key: paperId, Value: NotesSidecar from disk
export const notes = writable<Map<string, NotesSidecar>>(new Map())

// Derived: current selected paper's note (or null if not loaded/no paper selected)
export const currentPaperNote = derived(
  [notes, selectedPaperId],
  ([$notes, $paperId]) => {
    if (!$paperId) return null
    return $notes.get($paperId) ?? null
  }
)

// ─── Helper to batch-save (called from components, debounced by caller) ──────

const pendingSaves = new Map<string, ReturnType<typeof setTimeout>>()
const writes = new Map<string, Promise<void>>()

/**
 * Save a note to both store and disk.
 * 
 * Called from NotesEditor.svelte (debounced) and on blur.
 * - Updates the store immediately (for UI reactivity)
 * - Debounces disk write to avoid hammer I/O
 * - Cancels previous pending save on keystroke (new content = new timer)
 */
export async function saveNote(
  workspacePath: string,
  paperId: string,
  content: string
): Promise<void> {
  if (!workspacePath || !paperId) return

  // Clear any pending save (new save supercedes it)
  const key = `${workspacePath}::${paperId}`
  const pending = pendingSaves.get(key)
  if (pending) clearTimeout(pending)

  // Update store immediately (optimistic)
  const now = new Date().toISOString()
  const sidecar: NotesSidecar = {
    ...get(notes).get(paperId),
    version: 1,
    notes: [
      {
        id: paperId,
        paperId,
        content,
        createdAt: get(notes).get(paperId)?.notes[0]?.createdAt ?? now,
        updatedAt: now,
      }
    ]
  }

  notes.update(map => {
    map.set(paperId, sidecar)
    return map
  })

  // Schedule debounced disk write (300ms)
  pendingSaves.set(key, setTimeout(() => {
    pendingSaves.delete(key)
    const next = (writes.get(key) ?? Promise.resolve()).catch(() => {}).then(async () => {
      try {
        await saveNotes(workspacePath, paperId, sidecar)
        console.log(`[notes] Auto-saved for ${paperId} at ${new Date().toLocaleTimeString()}`)
      } catch (error) {
        console.error(`[notes] Auto-save failed for ${paperId}:`, error)
      }
    })
    writes.set(key, next)
    void next.finally(() => { if (writes.get(key) === next) writes.delete(key) })
  }, 300))
}
