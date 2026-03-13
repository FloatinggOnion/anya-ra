/**
 * Research notes type definitions for Phase 6.
 * Stored in {workspace}/notes/{paperId}.json — schema version 1.
 */

/** Single note attached to a paper */
export interface Note {
  id: string                    // UUID v4 (same as paperId for simplicity)
  paperId: string              // FK to Paper.id — establishes the attachment
  title?: string               // Optional: auto-generated as "Notes on [paper title]"
  content: string              // Markdown source (can be empty)
  createdAt: string            // ISO 8601
  updatedAt: string            // ISO 8601
}

/** Sidecar file shape: {workspace}/notes/{paperId}.json */
export interface NotesSidecar {
  version: 1                   // Schema version — bump if breaking change
  paperMetadata?: {            // Cache of paper title/authors (for export header)
    title: string
    authors: string[]
    year?: number
  }
  notes: Note[]                // Typically single-element array (one note per paper)
}
