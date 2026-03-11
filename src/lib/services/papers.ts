import { invoke } from '@tauri-apps/api/core'
import { open } from '@tauri-apps/plugin-dialog'
import type { Paper } from '../types/paper'

// ─── Storage commands ────────────────────────────────────────────────────────

export async function savePaper(workspacePath: string, paper: Paper): Promise<void> {
  return invoke<void>('save_paper', { workspacePath, paper })
}

export async function loadPapers(workspacePath: string): Promise<Paper[]> {
  return invoke<Paper[]>('load_papers', { workspacePath })
}

export async function deletePaper(workspacePath: string, paperId: string): Promise<void> {
  return invoke<void>('delete_paper', { workspacePath, paperId })
}

// ─── Search options ──────────────────────────────────────────────────────────

export interface SearchOptions {
  maxResults?: number
}

// ─── arXiv search ────────────────────────────────────────────────────────────

export async function searchArxiv(
  query: string,
  options: SearchOptions = {}
): Promise<Paper[]> {
  const { maxResults = 20 } = options

  return invoke<Paper[]>('search_arxiv', { query, maxResults })
}

// ─── Semantic Scholar search ─────────────────────────────────────────────────

// Rate limiting state (1 req/sec for free tier)
let lastSemanticRequestMs = 0

export async function searchSemanticScholar(
  query: string,
  options: SearchOptions = {}
): Promise<Paper[]> {
  const { maxResults = 20 } = options

  // Rate limit: ensure at least 1 second between requests
  const now = Date.now()
  const elapsed = now - lastSemanticRequestMs
  if (elapsed < 1000) {
    await new Promise<void>((resolve) => setTimeout(resolve, 1000 - elapsed))
  }
  lastSemanticRequestMs = Date.now()

  const url = new URL('https://api.semanticscholar.org/graph/v1/paper/search')
  url.searchParams.set('query', query)
  url.searchParams.set('limit', maxResults.toString())
  url.searchParams.set(
    'fields',
    ['title', 'authors', 'year', 'abstract', 'url', 'openAccessPdf', 'isOpenAccess', 'externalIds'].join(',')
  )

  const response = await fetch(url.toString(), {
    headers: { 'User-Agent': 'Anya-RA/0.1.0' },
  })

  if (!response.ok) {
    if (response.status === 429) {
      throw new Error('Semantic Scholar rate limit exceeded. Please wait and try again.')
    }
    throw new Error(`Semantic Scholar API error: ${response.status}`)
  }

  const data = (await response.json()) as {
    total: number
    data: Array<{
      paperId: string
      title: string
      authors: Array<{ name: string }>
      year: number | null
      abstract: string | null
      url: string
      openAccessPdf: { url: string; status: string } | null
      isOpenAccess: boolean
      externalIds: {
        DOI?: string
        ArXiv?: string
        PubMed?: string
      }
    }>
  }

  const nowIso = new Date().toISOString()

  return data.data.map((item) => {
    const paperId = `semantic_${item.paperId}`
    const pdfUrl = item.openAccessPdf?.url ?? null
    const openAccessStatus = (item.openAccessPdf?.status?.toLowerCase() ?? null) as
      | 'green'
      | 'blue'
      | 'bronze'
      | 'gold'
      | 'closed'
      | null

    return {
      id: paperId,
      source: 'semantic_scholar' as const,
      externalId: item.paperId,
      title: item.title,
      authors: item.authors.map((a) => a.name),
      year: item.year,
      abstract: item.abstract,
      url: item.url,
      doi: item.externalIds?.DOI ?? null,
      arxivId: item.externalIds?.ArXiv ?? null,
      semanticId: item.paperId,
      isOpenAccess: item.isOpenAccess,
      openAccessStatus,
      pdfUrl,
      localPdfPath: null,
      pdfDownloaded: false,
      importedAt: nowIso,
      addedAt: nowIso,
      lastUpdated: nowIso,
      tags: [],
    } satisfies Paper
  })
}

// ─── Local PDF import ────────────────────────────────────────────────────────

export async function importLocalPdf(workspacePath: string): Promise<Paper> {
  // Open file picker (dialog plugin — already bundled)
  const selected = await open({
    filters: [{ name: 'PDF', extensions: ['pdf'] }],
    multiple: false,
  })

  if (!selected || typeof selected !== 'string') {
    throw new Error('No file selected')
  }

  // Import via Rust command (copies PDF, creates metadata)
  return invoke<Paper>('import_local_pdf', {
    workspacePath,
    filePath: selected,
  })
}
