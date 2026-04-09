/**
 * Documents I/O service — invoke Rust commands via Tauri.
 * Handles load/save to {workspace}/documents/{docId}.md and {docId}.links.json
 */

import { invoke } from '@tauri-apps/api/core'
import type { Document, DocumentSidecar } from '../types/document'

/**
 * Load a single document from disk.
 * Returns null if file doesn't exist (new document).
 * Throws on read error (permission, corrupt JSON).
 *
 * Called from store initialization or document open.
 * Returns parsed markdown content as Document.
 */
export async function loadDocument(
  workspacePath: string,
  docId: string
): Promise<Document | null> {
  try {
    const result = await invoke<{
      id: string
      title: string
      content: string
      createdAt: string
      updatedAt: string
    }>('load_document', {
      workspacePath,
      docId,
    })
    return result as Document
  } catch (error: unknown) {
    if (error instanceof Error && error.message.includes('not found')) {
      return null
    }
    console.error(`[documents-io] Load failed for ${docId}:`, error)
    throw error
  }
}

/**
 * Load document metadata from sidecar file.
 * Returns null if file doesn't exist.
 * Throws on read error.
 *
 * Called after document content is loaded to populate link metadata.
 */
export async function loadDocumentSidecar(
  workspacePath: string,
  docId: string
): Promise<DocumentSidecar | null> {
  try {
    const content = await invoke<string>('load_document_sidecar', {
      workspacePath,
      docId,
    })
    return JSON.parse(content) as DocumentSidecar
  } catch (error: unknown) {
    if (error instanceof Error && error.message.includes('not found')) {
      return null
    }
    console.error(`[documents-io] Load sidecar failed for ${docId}:`, error)
    throw error
  }
}

/**
 * Save document content to disk.
 * Creates {workspace}/documents/ directory if missing.
 * Writes plain markdown (no YAML frontmatter) to {docId}.md
 * Overwrites existing file.
 *
 * Called from store debounced save.
 */
export async function saveDocument(
  workspacePath: string,
  docId: string,
  content: string
): Promise<void> {
  try {
    await invoke<void>('save_document', {
      workspacePath,
      docId,
      content,
    })
  } catch (error) {
    console.error(`[documents-io] Save failed for ${docId}:`, error)
    throw error
  }
}

/**
 * Save document metadata sidecar to disk.
 * Writes JSON to {docId}.links.json.
 * Overwrites existing file.
 *
 * Called from store debounced save (alongside saveDocument).
 */
export async function saveDocumentSidecar(
  workspacePath: string,
  docId: string,
  sidecar: DocumentSidecar
): Promise<void> {
  try {
    const content = JSON.stringify(sidecar, null, 2)
    await invoke<void>('save_document_sidecar', {
      workspacePath,
      docId,
      content,
    })
  } catch (error) {
    console.error(`[documents-io] Save sidecar failed for ${docId}:`, error)
    throw error
  }
}

/**
 * Delete a document and its sidecar from disk.
 * Removes both {docId}.md and {docId}.links.json.
 * Returns silently if files don't exist.
 * Throws on permission error.
 *
 * Called from delete action in sidebar.
 */
export async function deleteDocument(workspacePath: string, docId: string): Promise<void> {
  try {
    await invoke<void>('delete_document', {
      workspacePath,
      docId,
    })
  } catch (error) {
    console.error(`[documents-io] Delete failed for ${docId}:`, error)
    throw error
  }
}

/**
 * List all document IDs in the workspace.
 * Returns array of docIds found in {workspace}/documents/
 * (strips .md extension, returns base names only).
 * Returns empty array if directory doesn't exist.
 *
 * Called on app startup to populate sidebar.
 */
export async function listDocuments(workspacePath: string): Promise<string[]> {
  try {
    const result = await invoke<string[]>('list_documents', {
      workspacePath,
    })
    return result
  } catch (error) {
    console.error('[documents-io] List failed:', error)
    return []
  }
}

/**
 * Rename a document by renaming both content and sidecar files.
 * Renames {oldDocId}.md to {newDocId}.md and sidecars accordingly.
 * Returns silently if files don't exist.
 * Throws on permission error.
 *
 * Called from rename action in sidebar (Phase 2).
 */
export async function renameDocument(
  workspacePath: string,
  oldDocId: string,
  newDocId: string
): Promise<void> {
  try {
    await invoke<void>('rename_document', {
      workspacePath,
      oldDocId,
      newDocId,
    })
  } catch (error) {
    console.error(`[documents-io] Rename failed for ${oldDocId} -> ${newDocId}:`, error)
    throw error
  }
}

/**
 * Generate a unique document ID based on timestamp + random suffix.
 * Format: doc-{timestamp}-{random}
 * Example: doc-1712601600000-a7f3
 *
 * Called when creating a new document to ensure uniqueness.
 */
export async function generateDocumentId(workspacePath: string): Promise<string> {
  const timestamp = Date.now()
  const random = Math.random().toString(36).slice(2, 6)
  const docId = `doc-${timestamp}-${random}`
  return docId
}
