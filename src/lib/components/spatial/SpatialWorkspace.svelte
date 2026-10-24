<script lang="ts">
  import Icon from '../Icon.svelte'
  import { onMount, onDestroy, tick } from 'svelte'
  import { get } from 'svelte/store'
  import Toolbar from '../layout/Toolbar.svelte'
  import ThinkingCanvas from './ThinkingCanvas.svelte'
  import ResearchLibrary from './ResearchLibrary.svelte'
  import FocusPane from './FocusPane.svelte'
  import DocumentCreateDialog from '../document/DocumentCreateDialog.svelte'
  import KeyboardShortcutsPanel from '../KeyboardShortcutsPanel.svelte'
  import { workspace } from '../../stores/workspace'
  import { documents, selectedDocumentId } from '../../stores/documents'
  import { papers, selectedPaperId } from '../../stores/papers'
  import { graphNodes, graphEdges, addCanvasNode, flushGraph } from '../../stores/graph'
  import { canvasSelection, focusTool, focusedNodeId, openCanvasObject } from '../../stores/spatial'
  import { chatState, registerCanvasContextGetter } from '../../stores/chat'
  import { saveChatHistory } from '../../services/chat-persistence'
  import { buildCanvasContext } from '../../services/socratic'
  import { showToast } from '../../services/toast'
  import { createKeyboardHandlers } from '../../services/keyboard-handler'
  import type { ConceptNodeData } from '../../types/graph'

  let { onsettings }: { onsettings: () => void } = $props()
  let libraryOpen = $state(false)
  let showDocument = $state(false)
  let showShortcuts = $state(false)
  let wide = $state(false)
  let addMenu = $state(false)
  let searchQuery = $state('')
  let showSearch = $state(false)
  const tools = ['question', 'claim', 'application', 'experiment', 'note'] as const
  $effect(() => {
    const tool = $focusTool
    const documentId = $selectedDocumentId
    const paperId = $selectedPaperId
    if (tool && (documentId || paperId || tool === 'companion') && window.matchMedia('(max-width: 1100px)').matches) libraryOpen = false
  })
  function create(kind: typeof tools[number]) {
    const data = kind === 'note' ? { kind: 'note' as const, body: '' } : { kind: 'concept' as const, role: kind as ConceptNodeData['role'], label: `New ${kind}`, body: '' }
    const id = addCanvasNode(data)
    canvasSelection.set([id]); openCanvasObject(id); addMenu = false
  }
  function newChat() {
    if ($chatState.isStreaming) { showToast('Wait for the current response before starting a conversation.', 'info'); return }
    const id = addCanvasNode({ kind: 'chat', chatId: crypto.randomUUID(), title: 'Research conversation' })
    openCanvasObject(id)
  }
  function createSearch(event: Event) {
    event.preventDefault()
    if (!searchQuery.trim()) return
    const id = addCanvasNode({ kind: 'search', query: searchQuery.trim() })
    openCanvasObject(id); searchQuery = ''; showSearch = false
  }
  async function switchWorkspace() {
    if ($chatState.isStreaming) { showToast('Wait for the current response before switching workspaces.', 'info'); return }
    try {
      if ($chatState.currentChatId) await saveChatHistory($chatState.currentChatId)
      focusTool.set(null)
      await tick()
      await flushGraph()
      workspace.set(null)
    } catch { showToast('Could not save this workspace. Try again before switching.', 'error') }
  }
  onMount(() => {
    registerCanvasContextGetter(() => buildCanvasContext(get(graphNodes), get(graphEdges), get(canvasSelection), get(papers), get(documents)))
    const handlers = createKeyboardHandlers(() => showShortcuts = !showShortcuts)
    const keydown = (e: KeyboardEvent) => {
      handlers.handleKeydown(e)
      if (e.key === 'Escape') { showShortcuts = false; addMenu = false; showSearch = false }
    }
    window.addEventListener('keydown', keydown)
    return () => window.removeEventListener('keydown', keydown)
  })
  onDestroy(() => { registerCanvasContextGetter(() => ''); focusTool.set(null); focusedNodeId.set(null) })
</script>

<div class="spatial-workspace">
  <Toolbar on:open-settings={onsettings} />
  <div class="workbench" class:with-library={libraryOpen} class:with-focus={$focusTool !== null} class:wide>
    <nav class="rail" aria-label="Workspace tools">
      <button class:active={!$focusTool} onclick={() => focusTool.set(null)} title="Thinking canvas"><Icon name="canvas" size={22} />Canvas</button>
      <button class:active={libraryOpen} aria-expanded={libraryOpen} onclick={() => libraryOpen = !libraryOpen}><Icon name="library" size={22} />Library</button>
      <button class:active={$focusTool === 'companion'} onclick={() => focusTool.set($focusTool === 'companion' ? null : 'companion')}><Icon name="think" size={22} />Think</button>
      <button onclick={newChat}><Icon name="chat" size={22} />Chat</button>
      <div class="rail-spacer"></div>
      <button onclick={switchWorkspace} title="Switch workspace"><Icon name="switch" size={22} />Switch</button>
    </nav>
    {#if libraryOpen}<aside class="library-panel" aria-label="Research library"><button class="close-library" onclick={() => libraryOpen = false} aria-label="Close library">×</button><ResearchLibrary /></aside>{/if}
    <main class="canvas-area">
      <div class="creation-bar">
        <div class="add-wrap"><button class="add-button" aria-expanded={addMenu} onclick={() => addMenu = !addMenu}>+ Add thought</button>
          {#if addMenu}<div class="add-menu">{#each tools as kind}<button onclick={() => create(kind)}>{kind[0].toUpperCase() + kind.slice(1)}</button>{/each}</div>{/if}
        </div>
        <button onclick={() => showDocument = true}>Document</button>
        <button onclick={newChat}>Conversation</button>
        <button onclick={() => showSearch = !showSearch}>Search</button>
        {#if $focusTool}<button class="expand" onclick={() => wide = !wide} aria-pressed={wide}>{wide ? 'Balance view' : 'Expand focus'}</button>{/if}
      </div>
      {#if showSearch}<form class="search-create" onsubmit={createSearch}><input bind:value={searchQuery} aria-label="New research query" placeholder="What evidence are you looking for?" required /><button>Add search to canvas</button><button type="button" onclick={() => showSearch = false}>Cancel</button></form>{/if}
      <div class="canvas-container"><ThinkingCanvas oncreate={create} onlibrary={() => libraryOpen = true} /></div>
      <footer><span>Research → understanding → possibility</span><span>Local workspace · {$canvasSelection.length ? `${$canvasSelection.length} selected` : 'Your thinking, connected'}</span></footer>
    </main>
    {#if $focusTool}<aside class="focus-container"><FocusPane /></aside>{/if}
  </div>
</div>
<DocumentCreateDialog open={showDocument} onClose={() => showDocument = false} onSubmit={(event: CustomEvent<{ docId: string; title: string; content: string }>) => {
  const { docId, title } = event.detail
  const id = addCanvasNode({ kind: 'document', documentId: docId, title })
  selectedDocumentId.set(docId); openCanvasObject(id)
}} />
<KeyboardShortcutsPanel bind:isOpen={showShortcuts} />

<style>
  .spatial-workspace { display: flex; flex-direction: column; height: 100dvh; overflow: hidden; background: var(--color-bg); }
  .workbench { display: grid; grid-template-columns: 76px minmax(0, 1fr); flex: 1; min-height: 0; }
  .workbench.with-library { grid-template-columns: 76px 300px minmax(0, 1fr); }
  .workbench.with-focus { grid-template-columns: 76px minmax(260px, 1fr) minmax(400px, 44%); }
  .workbench.with-library.with-focus { grid-template-columns: 76px 280px minmax(160px, 1fr) minmax(380px, 40%); }
  .workbench.with-focus.wide { grid-template-columns: 76px minmax(180px, 1fr) minmax(500px, 65%); }
  .workbench.with-library.with-focus.wide { grid-template-columns: 76px 260px minmax(100px, 1fr) minmax(480px, 55%); }
  .rail { display: flex; flex-direction: column; padding: 20px 8px 12px; gap: 12px; border-right: 1px solid var(--color-border); background: var(--color-surface); }
  .rail button { border: 0; font-size: 10px; text-align: center; padding: 8px 0; display: flex; flex-direction: column; align-items: center; gap: 6px; border-radius: var(--radius-input); }
  .rail button.active { background: var(--color-accent-subtle); color: var(--color-accent); }
  .rail-spacer { flex: 1; }
  button { font: inherit; font-size: var(--text-sm); color: var(--color-text-secondary); background: transparent; border: 1px solid var(--color-border); border-radius: var(--radius-input); padding: 8px 12px; cursor: pointer; white-space: nowrap; }
  button:hover { background: var(--color-surface-2); color: var(--color-text); }
  .library-panel { position: relative; min-width: 0; min-height: 0; border-right: 1px solid var(--color-border); }
  .close-library { position: absolute; right: 8px; top: 8px; border: 0; padding: 0 5px; font-size: 20px; z-index: 1; }
  .canvas-area { display: flex; flex-direction: column; min-width: 0; min-height: 0; }
  .creation-bar { display: flex; flex-wrap: wrap; gap: 6px; align-items: center; padding: 12px 20px; border-bottom: 1px solid var(--color-border); }
  .creation-bar > button { border: 0; } .add-button { background: var(--color-surface); color: var(--color-text); }
  .add-wrap { position: relative; } .add-menu { position: absolute; z-index: 10; top: calc(100% + 8px); left: 0; width: 180px; padding: 6px; border: 1px solid var(--color-border); background: var(--color-surface); border-radius: var(--radius-card); box-shadow: 0 4px 12px var(--color-shadow); }
  .add-menu button { display: block; text-align: left; border: 0; width: 100%; }
  .expand { margin-left: auto; font-size: var(--text-xs); }
  .canvas-container { flex: 1; min-height: 0; }
  .focus-container { min-width: 0; min-height: 0; }
  footer { display: flex; justify-content: space-between; gap: 8px; padding: 9px 20px; border-top: 1px solid var(--color-border); font-size: 10px; color: var(--color-text-muted); }
  .search-create { display: flex; flex-wrap: wrap; gap: 8px; padding: 12px 20px; border-bottom: 1px solid var(--color-border); } .search-create input { flex: 1; min-width: 160px; padding: 8px; border: 1px solid var(--color-border-strong); background: var(--color-surface); color: var(--color-text); border-radius: var(--radius-input); }
  @media (max-width: 1100px) {
    .workbench.with-library.with-focus, .workbench.with-library.with-focus.wide { grid-template-columns: 64px minmax(0, 1fr) minmax(360px, 50%); }
    .with-focus .library-panel { position: absolute; left: 64px; top: 48px; bottom: 0; width: min(320px, calc(100% - 64px)); z-index: 20; box-shadow: 8px 0 24px var(--color-shadow); }
    .workbench, .workbench.with-library { grid-template-columns: 64px minmax(0, 1fr); }
    .workbench.with-library:not(.with-focus) { grid-template-columns: 64px 280px minmax(0, 1fr); }
    footer span:first-child { display: none; }
  }
  @media (max-width: 760px) {
    .workbench.with-focus, .workbench.with-focus.wide { grid-template-columns: 64px minmax(0, 1fr); }
    .focus-container { position: absolute; inset: 48px 0 0 64px; z-index: 15; }
    .with-focus .library-panel { z-index: 20; }
    .workbench.with-library:not(.with-focus) { grid-template-columns: 64px minmax(0, 1fr); }
    .library-panel { position: absolute; inset: 48px 0 0 64px; z-index: 20; }
    .creation-bar { padding: 12px; } .creation-bar button { font-size: 11px; padding: 8px; }
  }
</style>
