<script lang="ts">
  import { join } from '@tauri-apps/api/path'
  import { get } from 'svelte/store'
  import { graphNodes, updateCanvasNode } from '../../stores/graph'
  import { focusedNodeId, focusTool } from '../../stores/spatial'
  import { selectedPaperId, selectedPaper } from '../../stores/papers'
  import { selectedDocumentId, documents } from '../../stores/documents'
  import { workspace } from '../../stores/workspace'
  import { notes } from '../../stores/notes'
  import { loadNotes } from '../../services/notes-io'
  import { chatState } from '../../stores/chat'
  import { openChatSession } from '../../services/chat-persistence'
  import { nodeTitle } from '../../services/socratic'
  import Companion from './Companion.svelte'
  import ResearchLibrary from './ResearchLibrary.svelte'
  import PanelContent from '../layout/PanelContent.svelte'
  import type { MovableTab } from '../../types/ui-layout'

  const node = $derived($graphNodes.find(n => n.id === $focusedNodeId))
  const data = $derived(node?.data)
  const objectTool = $derived(data?.kind === 'paper' ? 'papers' : data?.kind === 'document' ? 'document' : data?.kind === 'chat' ? 'chat' : data?.kind === 'search' ? 'search' : data?.kind === 'note' && data.paperId ? 'notes' : 'object')
  const tool = $derived($focusTool === 'object' ? objectTool : $focusTool)
  let label = $state('')
  let body = $state('')
  let PDFViewerComponent: any = $state(null)
  let resolvedPdfPath = $state<string | null>(null)
  let chatReady = $state(false)
  let notesReady = $state(true)
  let error = $state('')
  const title = $derived($focusTool === 'object' && data ? nodeTitle(data) : tool === 'companion' ? 'Think with Anya' : tool === 'search' ? 'Discover research' : tool === 'papers' ? 'Paper details' : tool === 'pdf' ? 'Reading room' : tool === 'notes' ? 'Paper notes' : tool === 'document' ? 'Writing room' : 'Conversation')

  $effect(() => {
    if ($focusTool !== 'object' || !data) return
    if (data.kind === 'paper' || data.kind === 'note' && data.paperId) selectedPaperId.set(data.paperId!)
    if (data.kind === 'document') selectedDocumentId.set(data.documentId)
    label = data.kind === 'concept' ? data.label : ''
    body = data.kind === 'concept' || data.kind === 'note' ? data.body ?? '' : ''
  })
  $effect(() => {
    const id = tool === 'chat' && data?.kind === 'chat' ? data.chatId : null
    error = ''
    if (!id) { chatReady = true; return }
    let alive = true
    chatReady = false; error = ''
    openChatSession(id).then(() => { if (alive) chatReady = true }).catch(e => { if (alive) error = e.message })
    return () => { alive = false }
  })
  $effect(() => {
    const localPath = $selectedPaper?.localPdfPath
    const path = $workspace?.path
    let alive = true
    resolvedPdfPath = null
    if (tool === 'pdf' && localPath && path) {
      import('../pdf/PDFViewer.svelte').then(m => { if (alive) PDFViewerComponent = m.default })
      const absolute = localPath.startsWith('/') || /^[A-Za-z]:[\\/]/.test(localPath)
      Promise.resolve(absolute ? localPath : join(path, localPath)).then(value => { if (alive) resolvedPdfPath = value }).catch(e => { if (alive) error = String(e) })
    }
    return () => { alive = false }
  })
  $effect(() => {
    const paperId = $selectedPaperId
    const path = $workspace?.path
    let alive = true
    notesReady = true
    if (tool === 'notes' && paperId && path) {
      if (get(notes).has(paperId)) return
      notesReady = false
      loadNotes(path, paperId).then(sidecar => {
        if (!alive) return
        if (sidecar) notes.update(map => new Map(map).set(paperId, sidecar))
        notesReady = true
      })
    }
    return () => { alive = false }
  })
  function saveObject() {
    if (!node || !data) return
    if (data.kind === 'concept') updateCanvasNode(node.id, { ...data, label: label.trim(), body })
    if (data.kind === 'note') updateCanvasNode(node.id, { ...data, body })
  }
</script>

<section class="focus-pane" aria-label="Focused editor">
  <header><div><small>In focus</small><h2>{title}</h2></div><button aria-label="Close focused editor" title="Return to canvas" onclick={() => focusTool.set(null)}>×</button></header>
  {#if $focusTool === 'object' && data?.kind === 'paper'}
    <nav aria-label="Paper tools"><button onclick={() => focusTool.set('papers')}>Details</button><button onclick={() => focusTool.set('pdf')} disabled={!$selectedPaper?.localPdfPath}>Read PDF</button><button onclick={() => focusTool.set('notes')}>Notes</button></nav>
  {:else if (tool === 'pdf' || tool === 'notes' || tool === 'papers') && $selectedPaper}
    <nav aria-label="Paper tools"><button onclick={() => focusTool.set('papers')}>Details</button><button onclick={() => focusTool.set('pdf')} disabled={!$selectedPaper.localPdfPath}>Read PDF</button><button onclick={() => focusTool.set('notes')}>Notes</button></nav>
  {/if}
  <div class="content">
    {#if error}<p class="error" role="alert">{error}</p>
    {:else if $focusTool === 'object' && !node}<p class="hint">This object was removed from the canvas.</p>
    {:else if tool === 'companion'}<Companion />
    {:else if tool === 'search'}<ResearchLibrary initialQuery={data?.kind === 'search' ? data.query : ''} />
    {:else if tool === 'notes' && !notesReady}<p class="hint">Opening notes…</p>
    {:else if tool === 'object' && (data?.kind === 'concept' || data?.kind === 'note')}
      <form class="object-editor" onsubmit={e => { e.preventDefault(); saveObject() }}>
        {#if data.kind === 'concept'}<label for="object-label">{data.role ?? 'Concept'}</label><input id="object-label" bind:value={label} required />{/if}
        <label for="object-body">{data.kind === 'note' ? 'Your note' : 'Develop this thought'}</label>
        <textarea id="object-body" bind:value={body} rows={14} placeholder="What do you know? What remains uncertain?"></textarea>
        <button class="primary" disabled={data.kind === 'concept' && !label.trim()}>Save to canvas</button>
        <p class="hint">Use the canvas connections to relate this thought to evidence and other ideas.</p>
      </form>
    {:else if tool === 'chat' && !chatReady}<p class="hint">Opening conversation…</p>
    {:else if tool === 'document' && !$documents.has($selectedDocumentId ?? '')}<p class="hint">Choose or create a document in the library.</p>
    {:else if tool}
      {#key tool === 'document' ? $selectedDocumentId : tool === 'chat' ? $chatState.currentChatId : tool === 'notes' || tool === 'pdf' ? $selectedPaperId : tool}
        <PanelContent tab={tool as MovableTab} {resolvedPdfPath} {PDFViewerComponent} GraphCanvasComponent={null} />
      {/key}
    {/if}
  </div>
</section>

<style>
  .focus-pane { display: flex; flex-direction: column; height: 100%; min-width: 0; background: var(--color-surface); border-left: 1px solid var(--color-border); }
  header { display: flex; justify-content: space-between; align-items: flex-start; padding: 20px 24px; gap: 16px; border-bottom: 1px solid var(--color-border); }
  header div { min-width: 0; } small { color: var(--color-accent); font-size: var(--text-xs); } h2 { font: 400 23px/1.3 var(--font-display); margin: 6px 0 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  button { background: transparent; color: var(--color-text-secondary); border: 1px solid var(--color-border); border-radius: var(--radius-input); padding: 7px 10px; cursor: pointer; font-size: var(--text-sm); }
  button:hover { background: var(--color-surface-2); } header button { font-size: 23px; border: 0; padding: 0 6px; }
  nav { display: flex; gap: 8px; padding: 12px 24px; border-bottom: 1px solid var(--color-border); }
  .content { flex: 1; min-height: 0; overflow: auto; display: flex; flex-direction: column; }
  .object-editor { padding: 24px; } label { display: block; font-size: var(--text-sm); margin: 0 0 8px; text-transform: capitalize; }
  input, textarea { width: 100%; padding: 12px; margin-bottom: 24px; border: 1px solid var(--color-border-strong); border-radius: var(--radius-input); background: var(--color-bg); color: var(--color-text); font-size: var(--text-md); line-height: 1.8; }
  textarea { resize: vertical; font-family: var(--font-display); font-size: 18px; }
  .primary { background: var(--color-accent); color: var(--color-on-accent); }
  .hint { font-size: var(--text-sm); color: var(--color-text-muted); line-height: 1.7; padding: 16px 24px; } .object-editor .hint { padding: 0; }
  .error { color: var(--color-error); padding: 24px; }
</style>
