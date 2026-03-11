/**
 * Annotation Svelte store for Phase 3 PDF viewer.
 * Follows the workspace store pattern (Phase 1).
 *
 * Manages in-memory annotation state for the current open PDF.
 * Persistence is handled by the annotation service layer (T12).
 */
import { writable, derived } from 'svelte/store'
import type { Annotation } from '../types/annotation'

// ─── Core state ───────────────────────────────────────────────────────────────

/** All annotations for the currently open PDF */
export const annotations = writable<Annotation[]>([])

/** Currently selected annotation (for editing/deleting) */
export const selectedAnnotation = writable<Annotation | null>(null)

/** Current viewer page (1-indexed) */
export const currentPage = writable<number>(1)

// ─── Derived stores ───────────────────────────────────────────────────────────

/** Annotations filtered to the current page */
export const currentPageAnnotations = derived(
  [annotations, currentPage],
  ([$annotations, $currentPage]) => $annotations.filter((a) => a.page === $currentPage)
)

/** Count of annotations across all pages */
export const annotationCount = derived(annotations, ($annotations) => $annotations.length)

// ─── Mutation functions ───────────────────────────────────────────────────────

/**
 * Add a new annotation to the store.
 * Skips duplicates by id.
 */
export function addAnnotation(annotation: Annotation): void {
  annotations.update((list) => {
    if (list.some((a) => a.id === annotation.id)) return list
    return [...list, annotation]
  })
}

/**
 * Update an existing annotation by id.
 * Merges partial fields and updates `updatedAt`.
 */
export function updateAnnotation(id: string, partial: Partial<Annotation>): void {
  annotations.update((list) =>
    list.map((a) =>
      a.id === id
        ? { ...a, ...partial, id, updatedAt: new Date().toISOString() }
        : a
    )
  )
}

/**
 * Delete an annotation by id.
 * Also clears selectedAnnotation if it matches.
 */
export function deleteAnnotation(id: string): void {
  annotations.update((list) => list.filter((a) => a.id !== id))
  selectedAnnotation.update((sel) => (sel?.id === id ? null : sel))
}

/**
 * Set the selected annotation (pass null to deselect).
 */
export function selectAnnotation(id: string | null): void {
  annotations.update((list) => {
    const found = id ? (list.find((a) => a.id === id) ?? null) : null
    selectedAnnotation.set(found)
    return list
  })
}

/**
 * Replace all annotations (used when loading from sidecar).
 */
export function setAnnotations(list: Annotation[]): void {
  annotations.set([...list])
  selectedAnnotation.set(null)
}

/**
 * Clear all annotations and reset selection.
 */
export function clearAnnotations(): void {
  annotations.set([])
  selectedAnnotation.set(null)
}
