import { describe, it, expect, beforeEach, vi } from 'vitest'
import { get } from 'svelte/store'
import { notes, currentPaperNote, saveNote } from '../src/lib/stores/notes'
import { selectedPaperId } from '../src/lib/stores/papers'
import { workspace } from '../src/lib/stores/workspace'
import { exportNotesToDOCX } from '../src/lib/services/notes-export'
import type { Paper } from '../src/lib/types/paper'

describe('Notes Workflow', () => {
  const testWorkspacePath = '/tmp/test-workspace'
  const testPaper: Paper = {
    id: 'test_12345',
    title: 'Test Paper',
    authors: ['Author A', 'Author B'],
    year: 2024,
    source: 'arxiv',
    abstract: 'Test abstract',
    tags: [],
    pdfUrl: null,
    doi: null,
    localPdfPath: null,
  }

  beforeEach(() => {
    notes.set(new Map())
    selectedPaperId.set(null)
  })

  it('should export note to DOCX blob', async () => {
    const testContent = '# Research Insights\n\nThis is important.'
    const blob = await exportNotesToDOCX(
      testPaper.title,
      testPaper.authors,
      {
        id: testPaper.id,
        paperId: testPaper.id,
        content: testContent,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }
    )

    expect(blob).toBeInstanceOf(Blob)
    expect(blob.type).toContain('wordprocessingml')
    expect(blob.size).toBeGreaterThan(0)
  })

  it('should create note structure with timestamps', () => {
    const testContent = '# Research Insights\n\nThis is important.'
    const now = new Date().toISOString()
    const note = {
      id: testPaper.id,
      paperId: testPaper.id,
      content: testContent,
      createdAt: now,
      updatedAt: now,
    }

    expect(note.id).toBe(testPaper.id)
    expect(note.content).toBe(testContent)
    expect(note.createdAt).toBe(now)
    expect(note.updatedAt).toBe(now)
  })

  it('should track selected paper note in derived store', () => {
    const testContent = 'Test content'
    const sidecar = {
      version: 1 as const,
      notes: [
        {
          id: testPaper.id,
          paperId: testPaper.id,
          content: testContent,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ],
    }

    notes.set(new Map([[testPaper.id, sidecar]]))
    selectedPaperId.set(testPaper.id)

    const current = get(currentPaperNote)
    expect(current).toBe(sidecar)
  })
})
