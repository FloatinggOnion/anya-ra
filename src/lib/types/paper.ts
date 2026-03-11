export type PaperSource = 'arxiv' | 'semantic_scholar' | 'local'

export type OpenAccessStatus = 'green' | 'blue' | 'bronze' | 'gold' | 'closed'

export interface Paper {
  // Core identifiers
  id: string // Local unique id: {source}_{externalId}
  source: PaperSource
  externalId: string // arxiv id, S2 paperId, or filename

  // Bibliographic
  title: string
  authors: string[]
  year: number | null
  abstract: string | null

  // Links & access
  url: string // Primary URL (arXiv page, S2 page, etc.)
  doi: string | null
  arxivId: string | null
  semanticId: string | null
  isOpenAccess: boolean
  openAccessStatus: OpenAccessStatus | null
  pdfUrl: string | null // Remote PDF URL (null if paywalled)

  // Local storage (relative paths for portability)
  localPdfPath: string | null // Relative: "papers/{id}/paper.pdf"
  pdfDownloaded: boolean // True when Phase 3 downloads it

  // Metadata timestamps
  importedAt: string // ISO 8601
  addedAt: string // ISO 8601
  lastUpdated: string // ISO 8601

  // User organization (Phase 2 sets tags: [])
  tags: string[]
}

// For runtime use (includes computed absolute path)
export interface PaperWithPath extends Paper {
  folderPath: string // Absolute path to paper folder
}
