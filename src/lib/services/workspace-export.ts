/**
 * Workspace export service — orchestrate ZIP generation.
 * Handles papers, notes, search index, and optional PDFs.
 * 
 * Pattern: Papers + Notes → ZIP with HTML + metadata + search
 */

import JSZip from 'jszip'
import { createSearchIndex, serializeIndex } from './search-index'
import { generatePaperHTML } from './paper-html'
import { generateIndexHTML } from './index-html'
import { readFile } from '@tauri-apps/plugin-fs'
import type { Paper } from '../types/paper'
import type { Note } from '../types/notes'
import type { GraphFile } from '../types/graph'
import type { ExportMetadata, ExportOptions } from '../types/export'
import { validateExportMetadata } from '../types/export'

/**
 * Export workspace as ZIP archive.
 * Includes papers, notes, search index, metadata, and optional PDFs.
 * 
 * @param papers - Array of papers to export
 * @param notes - Array of notes (will be grouped by paperId)
 * @param graphData - Knowledge graph data (nodes/edges/viewport)
 * @param options - Export options (includePDFs, includeAnnotations, includeGraph)
 * @param onProgress - Optional callback: (current, total) => void for progress UI
 * @returns Promise<Blob> — downloadable ZIP file
 */
export async function exportWorkspace(
  papers: Paper[],
  notes: Note[],
  graphData: GraphFile,
  options: ExportOptions,
  onProgress?: (current: number, total: number) => void
): Promise<Blob> {
  const zip = new JSZip()

  // ─── Step 1: Generate metadata.json ───────────────────────────────────────

  const workspaceName = papers.length > 0 ? 'Research Workspace' : 'Empty Workspace'
  const metadata: ExportMetadata = {
    version: '1.0',
    workspace: {
      name: workspaceName,
      createdAt: new Date(0).toISOString(), // Default; ideally from workspace.json
      exportedAt: new Date().toISOString()
    },
    papers: papers.map(p => ({
      id: p.id,
      source: p.source,
      externalId: p.externalId,
      title: p.title,
      authors: p.authors,
      year: p.year,
      abstract: p.abstract,
      url: p.url,
      doi: p.doi,
      arxivId: p.arxivId,
      semanticId: p.semanticId,
      tags: p.tags || [],
      pdfIncluded: options.includePDFs && !!p.localPdfPath,
      importedAt: p.importedAt
    })),
    notes: notes.map(n => ({
      paperId: n.paperId,
      content: n.content,
      createdAt: n.createdAt,
      updatedAt: n.updatedAt
    })),
    graph: options.includeGraph
      ? graphData
      : { nodes: [], edges: [], viewport: { x: 0, y: 0, zoom: 1 } }
  }

  // Validate schema before writing
  if (!validateExportMetadata(metadata)) {
    throw new Error('Export metadata failed validation')
  }

  zip.file('metadata.json', JSON.stringify(metadata, null, 2))

  // ─── Step 2: Generate papers/ folder with HTML files ──────────────────────

  const papersFolder = zip.folder('papers')!
  const notesMap = new Map(notes.map(n => [n.paperId, notes.filter(nn => nn.paperId === n.paperId)]))

  for (let i = 0; i < papers.length; i++) {
    const paper = papers[i]
    const paperNotes = notesMap.get(paper.id) || []

    // Generate and add paper HTML
    const paperHTML = await generatePaperHTML(paper, paperNotes)
    papersFolder.file(`${paper.id}.html`, paperHTML)

    onProgress?.(i + 1, papers.length)

    // Yield to event loop to prevent UI freeze
    await new Promise(resolve => setTimeout(resolve, 0))
  }

  // ─── Step 3: Generate search index and add to assets/ ────────────────────

  const searchIndex = createSearchIndex(papers, notes)
  const searchIndexJSON = serializeIndex(searchIndex)

  const assetsFolder = zip.folder('assets')!
  assetsFolder.file('search.js', `const searchIndexData = ${searchIndexJSON};`)

  // ─── Step 4: Generate index.html (main entry point) ─────────────────────

  const indexHTML = generateIndexHTML(papers, searchIndexJSON)
  zip.file('index.html', indexHTML)

  // ─── Step 5: Add styles.css ──────────────────────────────────────────────

  const sharedStyles = generateSharedStyles()
  assetsFolder.file('styles.css', sharedStyles)

  // ─── Step 6: Optional PDFs folder ────────────────────────────────────────

  if (options.includePDFs && papers.some(p => p.localPdfPath)) {
    const pdfsFolder = zip.folder('pdfs')!

    for (const paper of papers) {
      if (paper.localPdfPath) {
        try {
          // Read PDF from disk using Tauri fs
          const pdfBlob = await readFile(paper.localPdfPath)
          pdfsFolder.file(`${paper.id}.pdf`, pdfBlob)
        } catch (e) {
          // Skip if file not found (e.g., deleted since import)
          console.warn(`Could not read PDF for ${paper.id}: ${e}`)
        }
      }
    }
  }

  // ─── Step 7: Generate final ZIP ──────────────────────────────────────────

  const zipBlob = await zip.generateAsync({
    type: 'blob',
    compression: 'DEFLATE',
    compressionOptions: { level: 9 }
  })

  return zipBlob
}

/**
 * Generate filename for download.
 */
export function generateExportFilename(): string {
  const today = new Date().toISOString().split('T')[0]
  return `export-workspace-${today}.zip`
}

/**
 * Shared CSS stylesheet for all papers and index.
 */
function generateSharedStyles(): string {
  return `
    /* Shared styles for exported archive */

    :root {
      --bg-dark: #0d1117;
      --bg-card: #1a1a1a;
      --bg-hover: #222;
      --text-primary: #e0e0e0;
      --text-secondary: #888;
      --text-muted: #666;
      --border-color: #333;
      --accent-blue: #64b5f6;
      --accent-green: #81c784;
    }

    * {
      box-sizing: border-box;
    }

    html, body {
      margin: 0;
      padding: 0;
      background: var(--bg-dark);
      color: var(--text-primary);
    }

    body {
      font-family: system-ui, -apple-system, sans-serif;
      line-height: 1.6;
    }

    a {
      color: var(--accent-blue);
      text-decoration: none;
    }

    a:hover {
      text-decoration: underline;
    }

    h1, h2, h3, h4, h5, h6 {
      margin-top: 24px;
      margin-bottom: 12px;
      font-weight: 600;
    }

    h1 { font-size: 28px; }
    h2 { font-size: 22px; }
    h3 { font-size: 18px; }

    p, li {
      margin: 8px 0;
    }

    ul, ol {
      padding-left: 24px;
      margin: 12px 0;
    }

    code {
      background: var(--bg-card);
      padding: 2px 6px;
      border-radius: 3px;
      font-family: 'Courier New', monospace;
      font-size: 13px;
    }

    pre {
      background: var(--bg-card);
      padding: 12px;
      border-radius: 6px;
      overflow-x: auto;
      border-left: 3px solid var(--accent-blue);
      margin: 12px 0;
    }

    pre code {
      background: none;
      padding: 0;
      border-radius: 0;
    }

    blockquote {
      border-left: 3px solid var(--accent-blue);
      margin: 12px 0;
      padding-left: 12px;
      color: var(--text-secondary);
      font-style: italic;
    }

    table {
      border-collapse: collapse;
      width: 100%;
      margin: 12px 0;
    }

    th, td {
      border: 1px solid var(--border-color);
      padding: 8px 12px;
      text-align: left;
    }

    th {
      background: var(--bg-card);
      font-weight: 600;
    }

    tr:nth-child(even) {
      background: rgba(255, 255, 255, 0.02);
    }

    img {
      max-width: 100%;
      height: auto;
      border-radius: 6px;
      margin: 12px 0;
    }

    /* Scrollbar styling */
    ::-webkit-scrollbar {
      width: 8px;
      height: 8px;
    }

    ::-webkit-scrollbar-track {
      background: var(--bg-dark);
    }

    ::-webkit-scrollbar-thumb {
      background: var(--border-color);
      border-radius: 4px;
    }

    ::-webkit-scrollbar-thumb:hover {
      background: var(--text-secondary);
    }

    /* Accessibility */
    @media (prefers-reduced-motion: reduce) {
      *, *::before, *::after {
        animation-duration: 0.01ms !important;
        animation-iteration-count: 1 !important;
        transition-duration: 0.01ms !important;
      }
    }
  `
}
