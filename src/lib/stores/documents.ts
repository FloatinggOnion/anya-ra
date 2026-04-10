/**
 * Frontend documents store — maps docId → loaded document content.
 *
 * Source of truth: disk files at {workspace}/documents/{docId}.md
 * Pattern: writable store with debounced persistence via documents-io service
 */

import { writable, derived } from 'svelte/store'
import { listDocuments, loadDocument, loadDocumentSidecar, saveDocument as ioSaveDocument, saveDocumentSidecar } from '../services/documents-io'
import { workspace } from './workspace'
import type { Document, DocumentSidecar, LinkMetadata } from '../types/document'

// Key: docId, Value: Document from disk
export const documents = writable<Map<string, Document>>(new Map())

// Key: docId, Value: LinkMetadata[] from sidecar
// Tracks all paper references found in each document
export const documentLinks = writable<Map<string, LinkMetadata[]>>(new Map())

// Optional: Derived store for current selected document
// (will be used when document sidebar selection is implemented)
export const selectedDocumentId = writable<string | null>(null)

export const currentDocument = derived(
  [documents, selectedDocumentId],
  ([$docs, $docId]) => {
    if (!$docId) return null
    return $docs.get($docId) ?? null
  }
)

// ─── Helper to debounce disk writes ───────────────────────────────────────

let pendingSave: ReturnType<typeof setTimeout> | null = null
let isSaving = false

/**
 * Save a document to both store and disk.
 *
 * Called from components (debounced by caller or internally here).
 * - Updates the store immediately (for UI reactivity)
 * - Debounces disk write to 300ms to avoid hammering I/O
 * - Cancels previous pending save on new keystroke (new content = new timer)
 * - Creates/updates metadata: createdAt (first save only), updatedAt (every save)
 */
export async function saveDocument(
  workspacePath: string,
  docId: string,
  title: string,
  content: string,
  createdAt?: string
): Promise<void> {
  if (!workspacePath || !docId || !title) return

  // Clear any pending save (new save supercedes it)
  if (pendingSave) clearTimeout(pendingSave)

  // Update store immediately (optimistic)
  const now = new Date().toISOString()
  const docCreatedAt = createdAt || now

  const document: Document = {
    id: docId,
    title,
    content,
    createdAt: docCreatedAt,
    updatedAt: now,
  }

  documents.update(map => {
    map.set(docId, document)
    return map
  })

  // Schedule debounced disk write (300ms)
  if (!isSaving) {
    pendingSave = setTimeout(async () => {
      isSaving = true
      try {
        // Save markdown content
        await ioSaveDocument(workspacePath, docId, content)

        // Save metadata sidecar with link info
        const sidecar: DocumentSidecar = {
          version: 1,
          docId,
          title,
          created: docCreatedAt,
          modified: now,
          links: [], // Links populated in Phase 2+ by validation
        }
        await saveDocumentSidecar(workspacePath, docId, sidecar)

        console.log(`[documents] Auto-saved for ${docId} at ${new Date().toLocaleTimeString()}`)
      } catch (error) {
        console.error(`[documents] Auto-save failed for ${docId}:`, error)
      } finally {
        isSaving = false
        pendingSave = null
      }
    }, 300)
  }
}

/**
 * Update document metadata (e.g., when user renames).
 * Called when user changes the document title.
 * Updates title in memory and schedules sidecar save.
 */
export async function updateDocumentMetadata(
  workspacePath: string,
  docId: string,
  newTitle: string
): Promise<void> {
  if (!workspacePath || !docId || !newTitle) return

  // Update store
  documents.update(map => {
    const doc = map.get(docId)
    if (doc) {
      doc.title = newTitle
      doc.updatedAt = new Date().toISOString()
    }
    return map
  })

  // Debounce metadata save (reuse pendingSave timer for consistency)
  if (pendingSave) clearTimeout(pendingSave)

  if (!isSaving) {
    pendingSave = setTimeout(async () => {
      isSaving = true
      try {
        const doc = getDocument(docId)
        if (!doc) return

        const sidecar: DocumentSidecar = {
          version: 1,
          docId,
          title: newTitle,
          created: doc.createdAt,
          modified: new Date().toISOString(),
          links: [], // Links preserved from original
        }
        await saveDocumentSidecar(workspacePath, docId, sidecar)

        console.log(`[documents] Metadata updated for ${docId}`)
      } catch (error) {
        console.error(`[documents] Metadata update failed for ${docId}:`, error)
      } finally {
        isSaving = false
        pendingSave = null
      }
    }, 300)
  }
}

// Helper to get document from store (for internal use)
function getDocument(docId: string): Document | undefined {
  let result: Document | undefined
  documents.subscribe(map => {
    result = map.get(docId)
  })()
  return result
}

/**
 * saveDocumentWithLinks - Save document content + link metadata atomically.
 *
 * Calls saveDocument() to write .md file, then saveDocumentSidecar() to write .links.json.
 * Updates both documents and documentLinks stores.
 * Called when validation has completed and user wants to persist.
 */
export async function saveDocumentWithLinks(
  workspacePath: string,
  docId: string,
  title: string,
  content: string,
  links: LinkMetadata[],
  createdAt?: string
): Promise<void> {
  if (!workspacePath || !docId || !title) return

  // Clear any pending save
  if (pendingSave) clearTimeout(pendingSave)

  // Update both stores immediately (optimistic)
  const now = new Date().toISOString()
  const docCreatedAt = createdAt || now

  const document: Document = {
    id: docId,
    title,
    content,
    createdAt: docCreatedAt,
    updatedAt: now,
  }

  documents.update(map => {
    map.set(docId, document)
    return map
  })

  documentLinks.update(map => {
    map.set(docId, links)
    return map
  })

  // Schedule debounced disk write (300ms)
  if (!isSaving) {
    pendingSave = setTimeout(async () => {
      isSaving = true
      try {
        // Save markdown content
        await ioSaveDocument(workspacePath, docId, content)

        // Save metadata sidecar with links
        const sidecar: DocumentSidecar = {
          version: 1,
          docId,
          title,
          created: docCreatedAt,
          modified: now,
          links,
        }
        await saveDocumentSidecar(workspacePath, docId, sidecar)

        console.log(`[documents] Auto-saved with ${links.length} links for ${docId} at ${new Date().toLocaleTimeString()}`)
      } catch (error) {
        console.error(`[documents] Auto-save with links failed for ${docId}:`, error)
      } finally {
        isSaving = false
        pendingSave = null
      }
    }, 300)
  }
}

/**
 * updateLinks - Update link metadata for a document in-memory.
 *
 * Updates documentLinks store without persisting to disk immediately.
 * Used during real-time validation (validation happens every keystroke,
 * but disk write is debounced by saveDocument).
 */
export function updateLinks(docId: string, links: LinkMetadata[]): void {
  documentLinks.update(map => {
    map.set(docId, links)
    return map
  })
}

/**
 * loadDocumentWithLinks - Load document content + links from disk.
 *
 * Calls loadDocument() + loadDocumentSidecar() in parallel.
 * Populates both documents and documentLinks stores.
 * Called when user opens a document to restore validation state.
 */
export async function loadDocumentWithLinks(
  workspacePath: string,
  docId: string
): Promise<{ document: Document | null, links: LinkMetadata[] }> {
  const [docResult, sidecarResult] = await Promise.all([
    loadDocument(workspacePath, docId),
    loadDocumentSidecar(workspacePath, docId),
  ])

  const document = docResult
  const links = sidecarResult?.links ?? []

  // Update stores
  if (document) {
    documents.update(map => {
      map.set(docId, document)
      return map
    })
  }

  documentLinks.update(map => {
    map.set(docId, links)
    return map
  })

  return { document, links }
}

/**
 * initializeDocuments — load all documents from disk into memory on startup.
 *
 * Called once from App.svelte after the workspace is confirmed available.
 * Lists all document IDs, then loads each document + sidecar in parallel.
 * Populates both `documents` and `documentLinks` stores so the sidebar is
 * populated immediately without requiring the user to open each document.
 */
export async function initializeDocuments(workspacePath: string): Promise<void> {
  try {
    const docIds = await listDocuments(workspacePath)
    if (docIds.length === 0) return

    // Load all documents in parallel — small enough to be fast, avoids waterfall
    const results = await Promise.allSettled(
      docIds.map(docId => Promise.all([
        loadDocument(workspacePath, docId),
        loadDocumentSidecar(workspacePath, docId),
      ]))
    )

    // Batch both store updates in a single pass
    const docMap = new Map<string, Document>()
    const linksMap = new Map<string, LinkMetadata[]>()

    results.forEach((result, i) => {
      if (result.status === 'rejected') {
        console.error(`[documents] Failed to load ${docIds[i]}:`, result.reason)
        return
      }
      const [doc, sidecar] = result.value
      if (doc) {
        docMap.set(doc.id, doc)
        linksMap.set(doc.id, sidecar?.links ?? [])
      }
    })

    documents.set(docMap)
    documentLinks.update(map => {
      linksMap.forEach((links, id) => map.set(id, links))
      return map
    })

    console.log(`[documents] Loaded ${docMap.size} document(s) from workspace`)
  } catch (error) {
    console.error('[documents] Failed to initialize documents:', error)
  }
}
