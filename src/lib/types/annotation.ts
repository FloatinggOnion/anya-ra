/**
 * Annotation type definitions for Phase 3 PDF viewer.
 * JSON schema: version 1, pdfHash, annotations array.
 *
 * Coordinate system: All rects stored in PDF coordinate space
 * (origin bottom-left, Y increases upward). Canvas transform applied at render time.
 */

export interface Rect {
  x: number
  y: number
  width: number
  height: number
}

/** Color options for highlights and underlines */
export type AnnotationColor = 'yellow' | 'green' | 'red'

/** Annotation type discriminator */
export type AnnotationType = 'highlight' | 'underline' | 'sticky'

/**
 * A single annotation on a PDF page.
 * All rect coordinates are in PDF coordinate space (bottom-left origin).
 */
export interface Annotation {
  /** Unique identifier (UUID v4) */
  id: string
  /** Annotation type */
  type: AnnotationType
  /** 1-indexed page number */
  page: number
  /** Bounding rectangles in PDF coordinate space (supports multi-line selections) */
  rects: Rect[]
  /** Highlight/underline color (not used for sticky notes) */
  color?: AnnotationColor
  /** Selected text at time of annotation creation */
  selectedText?: string
  /** Note content (sticky notes and highlight notes) */
  note?: string
  /** ISO 8601 creation timestamp */
  createdAt: string
  /** ISO 8601 last-updated timestamp */
  updatedAt: string
}

/**
 * Sidecar file structure for persisting annotations alongside a PDF.
 * Stored at: `{pdfPath}.annotations.json`
 */
export interface AnnotationSidecar {
  /** Schema version — always 1 */
  version: 1
  /** SHA-256 hex digest of the PDF file for change detection */
  pdfHash: string
  /** All annotations for this PDF */
  annotations: Annotation[]
}

/** PDF viewport info needed for coordinate transforms */
export interface PDFViewport {
  /** Page width in CSS pixels at current scale */
  width: number
  /** Page height in CSS pixels at current scale */
  height: number
  /** Current zoom scale factor */
  scale: number
  /** Original page width in PDF user units (at scale=1) */
  rawWidth?: number
  /** Original page height in PDF user units (at scale=1) */
  rawHeight?: number
}
