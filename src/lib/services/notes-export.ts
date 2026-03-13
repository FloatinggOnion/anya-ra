/**
 * Notes export service — convert markdown to PDF or DOCX.
 * 
 * Pattern: Markdown → Parsed HTML (via marked) → Document (jsPDF or docx lib)
 * Includes paper title and authors as header in export.
 */

import { marked } from 'marked'
import jsPDF from 'jspdf'
import html2canvas from 'html2canvas'
import { Document, Packer, Paragraph, TextRun, HeadingLevel } from 'docx'
import type { Note } from '../types/notes'

// ─── PDF Export ──────────────────────────────────────────────────────────────

/**
 * Export note as PDF with paper metadata header.
 */
export async function exportNotesToPDF(
  paperTitle: string,
  authors: string[],
  note: Note
): Promise<Blob> {
  const contentHTML = await marked(note.content)

  const container = document.createElement('div')
  container.innerHTML = `
    <div style="font-family: Arial, sans-serif; padding: 20px; max-width: 800px;">
      <h1 style="margin: 0 0 10px 0; font-size: 24px;">${escapeHTML(paperTitle)}</h1>
      <p style="margin: 0 0 20px 0; font-size: 12px; color: #666;">
        ${escapeHTML(authors.join(', '))}
      </p>
      <hr style="margin: 20px 0; border: none; border-top: 1px solid #ccc;">
      <div style="font-size: 14px; line-height: 1.6;">
        ${contentHTML}
      </div>
    </div>
  `
  container.style.position = 'absolute'
  container.style.left = '-9999px'
  container.style.background = 'white'
  document.body.appendChild(container)

  try {
    const canvas = await html2canvas(container, {
      scale: 2,
      logging: false,
      backgroundColor: '#fff',
    })

    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
    })

    const imgWidth = 210 - 20
    const imgHeight = (canvas.height * imgWidth) / canvas.width
    const pageHeight = 297 - 20

    let currentY = 10
    let imgData = canvas.toDataURL('image/png')

    while (currentY < imgHeight) {
      pdf.addImage(imgData, 'PNG', 10, currentY - imgHeight + pageHeight, imgWidth, imgHeight)
      currentY += pageHeight
      if (currentY < imgHeight) {
        pdf.addPage()
      }
    }

    return new Blob([pdf.output('arraybuffer')], { type: 'application/pdf' })
  } finally {
    document.body.removeChild(container)
  }
}

// ─── DOCX Export ────────────────────────────────────────────────────────────

/**
 * Export note as DOCX with paper metadata header.
 */
export async function exportNotesToDOCX(
  paperTitle: string,
  authors: string[],
  note: Note
): Promise<Blob> {
  const tokens = marked.lexer(note.content)

  const contentParagraphs: Paragraph[] = tokens.map((token: any) => {
    switch (token.type) {
      case 'heading':
        return new Paragraph({
          text: token.text || token.raw,
          heading: `HEADING_${Math.min(token.depth, 6)}` as any,
          spacing: { after: 200 },
        })

      case 'paragraph':
        return new Paragraph({
          text: token.text || token.raw,
          spacing: { after: 200 },
        })

      case 'code':
        return new Paragraph({
          text: token.text || token.raw,
          style: 'Code',
          spacing: { after: 200 },
        })

      case 'list':
        return new Paragraph({
          text: `${token.items?.map((item: any) => `• ${item.text}`).join('\n') || token.raw}`,
          spacing: { after: 200 },
        })

      case 'blockquote':
        return new Paragraph({
          children: [
            new TextRun({
              text: token.text || token.raw,
              italics: true,
            })
          ],
          indent: { left: 720 },
          spacing: { after: 200 },
        })

      case 'hr':
        return new Paragraph({
          text: '_______________________________________________',
          spacing: { after: 200 },
        })

      default:
        return token.text ? new Paragraph({
          text: token.text,
          spacing: { after: 200 },
        }) : new Paragraph('')
    }
  })

  const doc = new Document({
    sections: [
      {
        children: [
          new Paragraph({
            children: [
              new TextRun({
                text: paperTitle,
                bold: true,
                size: 32,
              })
            ],
            spacing: { after: 100 },
          }),
          new Paragraph({
            children: [
              new TextRun({
                text: authors.join(', '),
                italics: true,
              })
            ],
            spacing: { after: 400 },
          }),
          new Paragraph(''),
          ...contentParagraphs,
        ],
      },
    ],
  })

  return await Packer.toBlob(doc)
}

// ─── Helper utilities ────────────────────────────────────────────────────────

function escapeHTML(text: string): string {
  const div = document.createElement('div')
  div.textContent = text
  return div.innerHTML
}

export async function downloadFile(blob: Blob, filename: string): Promise<void> {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename

  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)

  setTimeout(() => URL.revokeObjectURL(url), 100)
}
