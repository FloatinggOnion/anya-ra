/**
 * Document type definitions for Phase 8.
 * Documents are markdown files stored in {workspace}/documents/{docId}.md
 * with metadata in {docId}.links.json (DocumentSidecar).
 */

/**
 * Document — represents a document in memory
 * Loaded from {docId}.md file
 */
export interface Document {
  id: string              // Unique document ID (e.g., "doc-001", "doc-review-2026")
  title: string           // Document title (e.g., "My Literature Review")
  content: string         // Markdown content
  createdAt: string       // ISO 8601 timestamp when first created
  updatedAt: string       // ISO 8601 timestamp of last edit
}

/**
 * LinkMetadata — represents a single paper reference within a document
 * Part of DocumentSidecar, enables bidirectional link tracking
 */
export interface LinkMetadata {
  citationText: string    // Text in [cite: ...] syntax, e.g., "Attention Is All You Need"
  paperId: string | null  // FK to papers store; null if paper not found (missing)
  position: number        // Character offset in document content (for highlighting/selection)
  status: 'valid' | 'missing'  // 'valid' if paper found, 'missing' if fuzzy match failed
  content?: string        // Optional: full "[cite: ...]" text (populated during parsing)
}

/**
 * DocumentSidecar — metadata for a document, persisted to {docId}.links.json
 * Parallel to NotesSidecar pattern: stores metadata separate from content file
 */
export interface DocumentSidecar {
  version: number         // Schema version (1 for now)
  docId: string           // Reference to the document ID
  title: string           // Cache of document title (for sidebar without loading .md)
  created: string         // ISO 8601 when document was created
  modified: string        // ISO 8601 when document was last saved
  links: LinkMetadata[]   // All paper references in this document (populated in Phase 2+ validation)
}
