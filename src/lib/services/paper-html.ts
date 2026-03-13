/**
 * Paper HTML generation for export archives.
 * Converts paper metadata + notes into standalone HTML file.
 * 
 * Pattern: Paper + Notes → marked(markdown) → HTML template
 */

import { marked } from 'marked'
import type { Paper } from '../types/paper'
import type { Note } from '../types/notes'

/**
 * Generate standalone HTML for a single paper with its notes.
 * Includes CSS reference to ../assets/styles.css
 */
export async function generatePaperHTML(
  paper: Paper,
  notes: Note[]
): Promise<string> {
  // Render markdown notes to HTML
  const notesHTML = await Promise.all(
    notes.map(n => marked(n.content))
  )

  // Build metadata links
  const links: string[] = []
  if (paper.doi) {
    links.push(`<a href="https://doi.org/${escapeHTML(paper.doi)}" target="_blank">DOI</a>`)
  }
  if (paper.arxivId) {
    links.push(`<a href="https://arxiv.org/abs/${escapeHTML(paper.arxivId)}" target="_blank">arXiv</a>`)
  }
  if (paper.url) {
    links.push(`<a href="${escapeHTML(paper.url)}" target="_blank">Paper Page</a>`)
  }

  const metadataLinks = links.length > 0 ? `<div class="metadata-links">${links.join(' • ')}</div>` : ''

  // Build tags section
  const tagsSection =
    paper.tags.length > 0
      ? `
    <div class="tags">
      ${paper.tags.map(t => `<span class="tag">${escapeHTML(t)}</span>`).join('')}
    </div>
  `
      : ''

  // Build notes section
  const notesSection =
    notesHTML.length > 0
      ? `
    <section class="notes">
      <h2>Research Notes</h2>
      <div class="note-content">
        ${notesHTML
          .map(
            (html, i) => `
          <div class="note" data-note-id="${i}">
            ${html}
          </div>
        `
          )
          .join('<hr class="note-divider">')}
      </div>
    </section>
  `
      : ''

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="description" content="${escapeHTML(paper.abstract || '')}">
  <title>${escapeHTML(paper.title)} • Research Workspace</title>
  <link rel="stylesheet" href="../assets/styles.css">
  <style>
    body { max-width: 900px; margin: 0 auto; padding: 20px; font-family: system-ui, -apple-system, sans-serif; }
    article { line-height: 1.6; color: #e0e0e0; }
    header { margin-bottom: 40px; border-bottom: 1px solid #444; padding-bottom: 20px; }
    h1 { margin: 0 0 10px 0; font-size: 28px; }
    .authors { margin: 5px 0; color: #b0b0b0; font-size: 16px; }
    .metadata { margin: 10px 0 0 0; color: #888; font-size: 14px; }
    .metadata-links { margin: 10px 0; }
    .metadata-links a { color: #64b5f6; text-decoration: none; margin-right: 15px; }
    .metadata-links a:hover { text-decoration: underline; }
    .year { display: inline-block; margin-right: 20px; }
    .tags { display: flex; gap: 8px; margin-top: 10px; flex-wrap: wrap; }
    .tag { background: #2a2a2a; padding: 4px 12px; border-radius: 4px; font-size: 13px; color: #888; }
    .abstract { margin-top: 20px; }
    .abstract h2 { margin-top: 0; }
    .abstract p { font-size: 15px; }
    .notes { margin-top: 40px; }
    .notes h2 { margin-top: 0; }
    .note { margin: 20px 0; padding: 15px; background: #1a1a1a; border-left: 3px solid #64b5f6; }
    .note-divider { margin: 30px 0; border: none; border-top: 1px solid #333; }
    .note-content h3 { margin-top: 0; }
    .note-content p { margin: 5px 0; }
    .note-content ul, .note-content ol { margin: 10px 0; padding-left: 20px; }
    .note-content code { background: #2a2a2a; padding: 2px 6px; border-radius: 3px; font-size: 13px; }
    .note-content pre { background: #1a1a1a; padding: 12px; border-radius: 4px; overflow-x: auto; }
    footer { margin-top: 60px; padding-top: 20px; border-top: 1px solid #444; font-size: 13px; color: #888; }
    footer a { color: #64b5f6; text-decoration: none; }
    footer a:hover { text-decoration: underline; }
  </style>
</head>
<body>
  <article>
    <header>
      <h1>${escapeHTML(paper.title)}</h1>
      <p class="authors">${escapeHTML(paper.authors.join(', '))}</p>
      <p class="metadata">
        ${paper.year ? `<span class="year">${paper.year}</span>` : '<span class="year">Year unknown</span>'}
        ${metadataLinks}
      </p>
      ${tagsSection}
    </header>

    ${
      paper.abstract
        ? `
    <section class="abstract">
      <h2>Abstract</h2>
      <p>${escapeHTML(paper.abstract)}</p>
    </section>
    `
        : ''
    }

    ${notesSection}

    <footer>
      <p>📚 Exported from Anya Research Workspace on ${new Date().toISOString().split('T')[0]}</p>
      <p><a href="../index.html">← Back to workspace</a></p>
    </footer>
  </article>
</body>
</html>`
}

/**
 * Escape HTML special characters to prevent XSS.
 * Use div.textContent + div.innerHTML pattern (safest).
 */
export function escapeHTML(text: string): string {
  const div = typeof document !== 'undefined' ? document.createElement('div') : null
  if (div) {
    div.textContent = text
    return div.innerHTML
  }
  // Fallback for non-browser environments
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}
