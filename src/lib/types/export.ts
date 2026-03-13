/**
 * Export workspace schema and validation.
 * Enables structured export and future re-import.
 */

import type { Paper } from './paper'
import type { Note } from './notes'
import type { GraphFile } from './graph'

export interface ExportOptions {
  includePDFs: boolean          // Include PDFs in /pdfs folder (larger file)
  includeAnnotations: boolean   // Include PDF annotations in metadata
  includeGraph: boolean         // Include graph snapshot
  filterTags?: string[]         // Optional: export only papers with these tags
}

export interface ExportMetadata {
  version: '1.0'
  workspace: {
    name: string
    createdAt: string                    // ISO 8601 (workspace folder creation)
    exportedAt: string                   // ISO 8601 (now)
  }
  papers: Array<{
    id: string                           // Local ID: {source}_{externalId}
    source: 'arxiv' | 'semantic_scholar' | 'local'
    externalId: string
    title: string
    authors: string[]
    year: number | null
    abstract: string | null
    url: string
    doi: string | null
    arxivId: string | null
    semanticId: string | null
    tags: string[]
    pdfIncluded: boolean                 // True if PDF in pdfs/ folder
    importedAt: string                   // ISO 8601
  }>
  notes: Array<{
    paperId: string
    content: string                      // Markdown source
    createdAt: string                    // ISO 8601
    updatedAt: string                    // ISO 8601
  }>
  graph: {
    nodes: any[]                         // GraphNode[] from graph store
    edges: any[]                         // GraphEdge[] from graph store
    viewport: { x: number; y: number; zoom: number }
  }
  annotations?: Array<{
    paperId: string
    page: number
    type: 'highlight' | 'note' | 'bookmark'
    content: string
    createdAt: string                    // ISO 8601
  }>
}

/**
 * Validate exported metadata matches schema.
 * Use for verifying imports.
 */
export function validateExportMetadata(data: unknown): data is ExportMetadata {
  if (typeof data !== 'object' || data === null) return false
  const m = data as any
  return (
    m.version === '1.0' &&
    typeof m.workspace?.name === 'string' &&
    typeof m.workspace?.createdAt === 'string' &&
    typeof m.workspace?.exportedAt === 'string' &&
    Array.isArray(m.papers) &&
    Array.isArray(m.notes) &&
    m.papers.every((p: any) => 
      typeof p.id === 'string' && 
      typeof p.title === 'string' &&
      Array.isArray(p.authors)
    ) &&
    m.notes.every((n: any) => 
      typeof n.paperId === 'string' && 
      typeof n.content === 'string'
    )
  )
}

/**
 * Compute file size estimate before export.
 * Helps user decide on PDF inclusion.
 */
export function estimateExportSize(
  papers: Paper[],
  notes: Note[],
  options: ExportOptions
): { htmlSize: number; metadataSize: number; pdfSize: number; totalSize: number } {
  // Rough estimates (actual varies by content)
  const htmlSize = papers.length * 50000                      // ~50KB per paper HTML
  const metadataSize = JSON.stringify({ papers, notes }).length
  const pdfSize = options.includePDFs 
    ? papers.filter(p => p.localPdfPath).length * 2000000     // ~2MB per PDF avg
    : 0
  
  return {
    htmlSize,
    metadataSize,
    pdfSize,
    totalSize: htmlSize + metadataSize + pdfSize
  }
}
