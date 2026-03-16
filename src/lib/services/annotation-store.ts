/**
 * Annotation service layer — wraps Tauri IPC commands for annotation persistence.
 * Follows the workspace service pattern (Phase 1).
 */
import { invoke } from '@tauri-apps/api/core'
import { get } from 'svelte/store'
import type { AnnotationSidecar } from '../types/annotation'
import { workspace } from '../stores/workspace'

function requireWorkspacePath(): string {
  const ws = get(workspace)
  if (!ws?.path) throw new Error('No workspace selected')
  return ws.path
}

/**
 * Load annotations from the sidecar file for a given PDF.
 * Returns null if no sidecar exists yet.
 *
 * @param pdfPath - Absolute path to the PDF file
 */
export async function loadAnnotations(pdfPath: string): Promise<AnnotationSidecar | null> {
  try {
    const workspacePath = requireWorkspacePath()
    const result = await invoke<AnnotationSidecar | null>('load_annotations', { workspacePath, pdfPath })
    return result
  } catch (error) {
    console.error('[annotation-store] Failed to load annotations:', error)
    return null
  }
}

/**
 * Save annotations to the sidecar file alongside the PDF.
 *
 * @param pdfPath - Absolute path to the PDF file
 * @param sidecar - Full sidecar data to write
 */
export async function saveAnnotations(
  pdfPath: string,
  sidecar: AnnotationSidecar
): Promise<void> {
  try {
    const workspacePath = requireWorkspacePath()
    await invoke<void>('save_annotations', { workspacePath, pdfPath, annotations: sidecar })
  } catch (error) {
    console.error('[annotation-store] Failed to save annotations:', error)
    throw error
  }
}

/**
 * Compute SHA-256 hash of a PDF file for change detection.
 * Returns hash in `sha256:HEX` format.
 *
 * @param pdfPath - Absolute path to the PDF file
 */
export async function computePdfHash(pdfPath: string): Promise<string> {
  try {
    const workspacePath = requireWorkspacePath()
    return await invoke<string>('compute_pdf_hash', { workspacePath, pdfPath })
  } catch (error) {
    console.error('[annotation-store] Failed to compute PDF hash:', error)
    throw error
  }
}
