/**
 * Phase 1.3 Empty States — content tests.
 * Verifies each empty-state string + CTA presence.
 * Uses exported constants + Svelte source assertions to stay light (no heavy component render).
 */
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import {
  GRAPH_EMPTY_MESSAGE,
  GRAPH_EMPTY_CTA,
  PDF_EMPTY_MESSAGE,
  DOCUMENT_EMPTY_TITLE,
  DOCUMENT_EMPTY_MESSAGE,
  DOCUMENT_NEW_GUIDANCE,
  CHAT_NO_PROVIDER_HINT,
  NOTES_EMPTY_GUIDANCE,
} from '../src/lib/components/emptyStates'

const root = process.cwd()
const src = (p: string) => readFileSync(join(root, p), 'utf-8')

describe('empty states', () => {
  it('graph: exposes guidance message + Add Concept CTA', () => {
    expect(GRAPH_EMPTY_MESSAGE).toBe(
      'Add concepts/notes to build your knowledge graph'
    )
    expect(GRAPH_EMPTY_CTA).toBe('Add Concept')
  })

  it('graph: GraphCanvas renders guidance + CTA with accessible status', () => {
    const svelte = src('src/lib/components/graph/GraphCanvas.svelte')
    expect(svelte).toContain('Add concepts/notes to build your knowledge graph')
    expect(svelte).toContain('Add Concept')
    expect(svelte).toContain('<button')
    expect(svelte).toContain('role="status"')
  })

  it('pdf: exposes no-paper guidance string', () => {
    expect(PDF_EMPTY_MESSAGE).toBe(
      'Select a paper from the sidebar, then click View PDF'
    )
  })

  it('pdf: PDFViewer renders no-paper guidance with accessible status', () => {
    const svelte = src('src/lib/components/pdf/PDFViewer.svelte')
    expect(svelte).toContain(
      'Select a paper from the sidebar, then click View PDF'
    )
    expect(svelte).toContain('role="status"')
  })

  it('document: keeps existing copy + adds New Document guidance', () => {
    expect(DOCUMENT_EMPTY_TITLE).toBe('No document selected')
    expect(DOCUMENT_EMPTY_MESSAGE).toContain(
      'Select a document from the sidebar'
    )
    expect(DOCUMENT_NEW_GUIDANCE).toContain('New Document')
  })

  it('document: DocumentEditor renders existing copy + New Document guidance', () => {
    const svelte = src('src/lib/components/document/DocumentEditor.svelte')
    expect(svelte).toContain('No document selected')
    expect(svelte).toContain('New Document')
    expect(svelte).toContain('role="status"')
  })

  it('chat: exposes Configure LLM hint', () => {
    expect(CHAT_NO_PROVIDER_HINT).toBe('Configure LLM in Settings')
  })

  it('chat: ChatWindow renders hint when no provider', () => {
    const svelte = src('src/lib/components/chat/ChatWindow.svelte')
    expect(svelte).toContain('Configure LLM in Settings')
    expect(svelte).toContain('role="status"')
  })

  it('notes: exposes Take notes guidance', () => {
    expect(NOTES_EMPTY_GUIDANCE).toBe('Take notes on papers')
  })

  it('notes: NotesPanel renders Take notes guidance with accessible status', () => {
    const svelte = src('src/lib/components/editor/NotesPanel.svelte')
    expect(svelte).toContain('Take notes on papers')
    expect(svelte).toContain('role="status"')
  })
})
