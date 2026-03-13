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

export async function searchSemanticScholar(
  query: string,
  options: SearchOptions = {}
): Promise<Paper[]> {
  const { maxResults = 20 } = options

  // Delegate to Rust: browser fetch() blocks custom User-Agent headers
  const rawJson = await invoke<string>('search_semantic_scholar', {
    query,
    maxResults,
  })

  const data = JSON.parse(rawJson) as {
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
      externalIds: { DOI?: string; ArXiv?: string; PubMed?: string }
    }>
  }

  const nowIso = new Date().toISOString()

  return (data.data ?? []).map((item) => {
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
      title: item.title ?? 'Untitled',
      authors: (item.authors ?? []).map((a) => a.name),
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

// ─── PDF download ─────────────────────────────────────────────────────────────

export async function downloadPdfToWorkspace(
  workspacePath: string,
  paper: Paper,
  pdfUrl: string
): Promise<Paper> {
  const destPath = `${workspacePath}/.anya/papers/${paper.id}/paper.pdf`
  await invoke<void>('download_pdf', { url: pdfUrl, destPath })
  // Store relative path to .anya folder (not absolute)
  const relativePdfPath = `.anya/papers/${paper.id}/paper.pdf`
  const updated: Paper = { ...paper, localPdfPath: relativePdfPath, pdfDownloaded: true }
  await invoke<void>('save_paper', { workspacePath, paper: updated })
  return updated
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
