import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { get } from 'svelte/store'
import { invoke } from '@tauri-apps/api/core'
import { workspace } from '../../src/lib/stores/workspace'
import { graphNodes, graphEdges, graphViewport, addCanvasNode, removeCanvasNodes, persistGraph, flushGraph, initializeGraph } from '../../src/lib/stores/graph'
import { settings, loadSettings, updateSuggestionSettings } from '../../src/lib/stores/settings'
import { saveNote } from '../../src/lib/stores/notes'
import { saveDocumentWithLinks, updateDocumentMetadata } from '../../src/lib/stores/documents'
import { chatState, clearChat, registerCanvasContextGetter, streamChat } from '../../src/lib/stores/chat'
import { openChatSession, autoSaveChatHistory } from '../../src/lib/services/chat-persistence'
import type { LLMProvider, Message } from '../../src/lib/types/llm'

beforeEach(() => {
  vi.useFakeTimers(); vi.mocked(invoke).mockReset(); vi.mocked(invoke).mockResolvedValue(undefined)
  workspace.set({ path: '/workspace-a', name: 'A', createdAt: '', lastOpened: '' })
  graphNodes.set([]); graphEdges.set([]); graphViewport.set({ x: 0, y: 0, zoom: 1 }); clearChat()
})
afterEach(async () => { await vi.runAllTimersAsync(); vi.useRealTimers(); registerCanvasContextGetter(() => '') })

describe('spatial persistence', () => {
  it('round-trips spatial object kinds and restores typed edges and viewport', async () => {
    const doc = addCanvasNode({ kind: 'document', documentId: 'doc-a', title: 'A draft' })
    const chat = addCanvasNode({ kind: 'chat', chatId: 'chat-a', title: 'An inquiry' })
    expect(addCanvasNode({ kind: 'document', documentId: 'doc-a', title: 'A draft' })).toBe(doc)
    addCanvasNode({ kind: 'search', query: 'evidence' })
    graphEdges.set([{ id: 'connection', source: doc, target: chat, data: { type: 'related' } }])
    persistGraph({ x: 120, y: 70, zoom: .7 }); await flushGraph()
    const save = vi.mocked(invoke).mock.calls.find(([command]) => command === 'save_graph_file')!
    const file = JSON.parse((save[1] as { content: string }).content)
    vi.mocked(invoke).mockImplementation(async command => command === 'load_graph_file' ? JSON.stringify(file) : undefined)
    graphNodes.set([]); graphEdges.set([]); await initializeGraph()
    expect(get(graphNodes).map(n => n.data.kind)).toEqual(['document', 'chat', 'search'])
    expect(get(graphEdges)[0].type).toBe('typed')
    expect(get(graphViewport)).toEqual({ x: 120, y: 70, zoom: .7 })
    removeCanvasNodes([doc]); expect(get(graphEdges)).toEqual([])
  })

  it('keeps pending canvas writes associated with their original workspace', async () => {
    addCanvasNode({ kind: 'note', body: 'Workspace A only' })
    workspace.set({ path: '/workspace-b', name: 'B', createdAt: '', lastOpened: '' })
    graphNodes.set([]); addCanvasNode({ kind: 'note', body: 'Workspace B only' })
    await flushGraph()
    const saves = vi.mocked(invoke).mock.calls.filter(([command]) => command === 'save_graph_file').map(([, args]) => args as { workspacePath: string; content: string })
    expect(saves).toHaveLength(2)
    expect(saves[0].workspacePath).toBe('/workspace-a')
    expect(saves[0].content).toContain('Workspace A only')
    expect(saves[1].workspacePath).toBe('/workspace-b')
    expect(saves[1].content).not.toContain('Workspace A only')
  })

  it('does not discard one document save when another document is edited immediately', async () => {
    await saveDocumentWithLinks('/workspace-a', 'doc-a', 'A', 'Writing A', [])
    await saveDocumentWithLinks('/workspace-a', 'doc-b', 'B', 'Writing B', [])
    await vi.advanceTimersByTimeAsync(350)
    const saves = vi.mocked(invoke).mock.calls.filter(([command]) => command === 'save_document').map(([, args]) => args)
    expect(saves).toEqual(expect.arrayContaining([
      expect.objectContaining({ docId: 'doc-a', content: 'Writing A' }),
      expect.objectContaining({ docId: 'doc-b', content: 'Writing B' }),
    ]))
  })
  it('keeps pending content and citation links when a document is renamed', async () => {
    const links = [{ citationText: 'A paper', paperId: 'paper-a', position: 0, status: 'valid' as const }]
    await saveDocumentWithLinks('/workspace-a', 'draft', 'Old title', 'New writing', links)
    await updateDocumentMetadata('/workspace-a', 'draft', 'New title')
    await vi.advanceTimersByTimeAsync(350)
    const calls = vi.mocked(invoke).mock.calls
    expect(calls.find(([cmd]) => cmd === 'save_document')?.[1]).toEqual(expect.objectContaining({ docId: 'draft', content: 'New writing' }))
    const sidecar = calls.find(([cmd]) => cmd === 'save_document_sidecar')?.[1] as { content: string }
    expect(JSON.parse(sidecar.content)).toEqual(expect.objectContaining({ title: 'New title', links }))
  })

  it('preserves separate pending note writes when moving between papers', async () => {
    await saveNote('/workspace-a', 'paper-a', 'Notes A')
    await saveNote('/workspace-a', 'paper-b', 'Notes B')
    await vi.advanceTimersByTimeAsync(350)
    const saves = vi.mocked(invoke).mock.calls.filter(([command]) => command === 'save_notes').map(([, args]) => args)
    expect(saves).toEqual(expect.arrayContaining([
      expect.objectContaining({ paperId: 'paper-a', content: expect.stringContaining('Notes A') }),
      expect.objectContaining({ paperId: 'paper-b', content: expect.stringContaining('Notes B') }),
    ]))
  })

  it('resets workspace preferences without writing outgoing settings into the new workspace', async () => {
    await loadSettings('/workspace-a')
    updateSuggestionSettings({ telemetryOptIn: true })
    workspace.set({ path: '/workspace-b', name: 'B', createdAt: '', lastOpened: '' })
    await loadSettings('/workspace-b')
    expect(get(settings).suggestions.telemetryOptIn).toBe(false)
    await vi.advanceTimersByTimeAsync(350)
    const saves = vi.mocked(invoke).mock.calls.filter(([command]) => command === 'save_settings')
    expect(saves).toHaveLength(1)
    expect(saves[0][1]).toEqual(expect.objectContaining({ workspacePath: '/workspace-a' }))
  })

  it('surfaces unreadable canvas files rather than replacing them with an empty canvas', async () => {
    vi.mocked(invoke).mockResolvedValue('{broken JSON')
    await expect(initializeGraph()).rejects.toThrow()
    expect(vi.mocked(invoke).mock.calls.some(([command]) => command === 'save_graph_file')).toBe(false)
  })

})

describe('spatial conversations', () => {
  it('saves the outgoing conversation and never writes its replacement under the old ID', async () => {
    chatState.set({ currentChatId: 'a', messages: [{ id: 'm', role: 'user', content: 'A only', timestamp: '', contextItems: [] }], draftSections: [], isStreaming: false, error: null })
    autoSaveChatHistory('a')
    vi.mocked(invoke).mockImplementation(async command => command === 'load_chat_file' ? JSON.stringify({ messages: [{ id: 'b', role: 'assistant', content: 'B only', timestamp: '', contextItems: [] }], draftSections: [] }) : undefined)
    await openChatSession('b'); await vi.advanceTimersByTimeAsync(2500)
    expect(get(chatState).messages[0].content).toBe('B only')
    const saves = vi.mocked(invoke).mock.calls.filter(([command]) => command === 'save_chat_file')
    expect(saves).toHaveLength(1)
    expect((saves[0][1] as { content: string }).content).toContain('A only')
    expect((saves[0][1] as { content: string }).content).not.toContain('B only')
  })

  it('keeps debounced conversation saves in their original workspace', async () => {
    chatState.set({ currentChatId: 'a', messages: [{ id: 'm', role: 'user', content: 'Workspace A', timestamp: '', contextItems: [] }], draftSections: [], isStreaming: false, error: null })
    autoSaveChatHistory('a')
    workspace.set({ path: '/workspace-b', name: 'B', createdAt: '', lastOpened: '' })
    clearChat()
    await vi.advanceTimersByTimeAsync(2500)
    const save = vi.mocked(invoke).mock.calls.find(([command]) => command === 'save_chat_file')!
    expect(save[1]).toEqual(expect.objectContaining({ workspacePath: '/workspace-a', chatId: 'a', content: expect.stringContaining('Workspace A') }))
  })

  it('grounds chat in selected canvas material and excludes the empty assistant placeholder', async () => {
    registerCanvasContextGetter(() => 'Selected evidence only')
    let sent: Message[] = []
    const provider = { async *chat(messages) { sent = messages; yield 'A useful question.' } } as LLMProvider
    await streamChat('Where could this lead?', provider)
    expect(sent.some(m => m.role === 'system' && m.content.includes('Socratic'))).toBe(true)
    expect(sent.some(m => m.content.includes('Selected evidence only'))).toBe(true)
    expect(sent.at(-1)).toEqual({ role: 'user', content: 'Where could this lead?' })
    expect(get(chatState).messages.at(-1)?.content).toBe('A useful question.')
    chatState.update(state => ({ ...state, isStreaming: true }))
    await expect(openChatSession('other')).rejects.toThrow('current response')
  })
})
