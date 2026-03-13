/**
 * Frontend notes store — maps paperId → loaded note content.
 * 
 * Source of truth: disk files at {workspace}/notes/{paperId}.json
 * Pattern: writable store with debounced persistence via notes-io service
 */

import { writable, derived } from 'svelte/store'
import { selectedPaperId } from './papers'
import { workspace } from './workspace'
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

let pendingSave: ReturnType<typeof setTimeout> | null = null
let isSaving = false

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
  if (pendingSave) clearTimeout(pendingSave)

  // Update store immediately (optimistic)
  const now = new Date().toISOString()
  const sidecar: NotesSidecar = {
    version: 1,
    notes: [
      {
        id: paperId,
        paperId,
        content,
        createdAt: new Date().toISOString(),
        updatedAt: now,
      }
    ]
  }

  notes.update(map => {
    map.set(paperId, sidecar)
    return map
  })

  // Schedule debounced disk write (300ms)
  if (!isSaving) {
    pendingSave = setTimeout(async () => {
      isSaving = true
      try {
        await saveNotes(workspacePath, paperId, sidecar)
        console.log(`[notes] Auto-saved for ${paperId} at ${new Date().toLocaleTimeString()}`)
      } catch (error) {
        console.error(`[notes] Auto-save failed for ${paperId}:`, error)
      } finally {
        isSaving = false
        pendingSave = null
      }
    }, 300)
  }
}
