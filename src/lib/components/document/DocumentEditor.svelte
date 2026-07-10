<script lang="ts">
  import { onMount } from 'svelte'
  import { selectedDocumentId, currentDocument, documentLinks, updateLinks, saveDocumentWithLinks } from '../../stores/documents'
  import { papers } from '../../stores/papers'
  import NotesEditor from '../editor/NotesEditor.svelte'
  import { workspace } from '../../stores/workspace'
  import { validateAndGetLinks } from '../../services/document-validation'
  import { SuggestionService } from '../../services/suggestions'
  import { SuggestionProviderChain } from '../../services/suggestion-provider-chain'
  import { settings } from '../../stores/settings'
  import { providerState, initializeProvider, switchProvider } from '../../stores/llm-provider'
  import { clearAll as clearSidebar } from '../../stores/suggestion-sidebar'
  import { recordInsertion } from '../../stores/telemetry'
  import { showToast } from '../../services/toast'
  import { setSuggestionService } from '../../stores/suggestion-service.svelte'
  import { setCursor, setCursorDoc } from '../../stores/cursor-position.svelte'

  let content = $state('')
  let currentLinks: any[] = $state([])
  let validationTimeout: ReturnType<typeof setTimeout> | null = null
  let autoSaveTimeout: ReturnType<typeof setTimeout> | null = null
  let lastLoadedContent = ''
  let isGeneratingSuggestion = $state(false)
  let suggestionService: SuggestionService | null = null
  let cursorPosition = $state(0)

  function handleCursorMove(pos: number) {
    cursorPosition = pos
    setCursor(pos)
  }

  // Initialize provider on mount
  onMount(async () => {
    console.log('[DocumentEditor] Initializing LLM provider...')
    await initializeProvider()
    console.log('[DocumentEditor] Provider initialized:', {
      type: $providerState.type,
      hasProvider: !!$providerState.provider,
      error: $providerState.error
    })
  })

  // Initialize suggestion service when provider is available
  $effect(() => {
    const provider = $providerState.provider
    const type = $providerState.type
    const error = $providerState.error

    console.log('[DocumentEditor] Provider state changed:', { type, hasProvider: !!provider, error })

    if (provider && !suggestionService) {
      console.log('[DocumentEditor] ✓ Initializing SuggestionService with provider:', type)

      const initChain = async () => {
        const fallbackProviders = []
        const settingsVal = $settings

        if (type === 'ollama' && $providerState.apiKey) {
          try {
            const { OpenRouterProvider } = await import('../../services/llm/openrouter')
            fallbackProviders.push(new OpenRouterProvider($providerState.apiKey))
          } catch (e) {
            console.warn('[DocumentEditor] Could not load OpenRouter fallback:', e)
          }
        } else if (type === 'openrouter') {
          const { OllamaProvider } = await import('../../services/llm/ollama')
          fallbackProviders.push(new OllamaProvider(settingsVal.suggestions.ollamaHost, settingsVal.suggestions.ollamaPort))
        }

        const chain = new SuggestionProviderChain(
          provider,
          fallbackProviders,
          (msg) => {
            console.warn('[SuggestionProviderChain] Fallback:', msg)
            showToast(`⚠️ ${msg}`, 'info', 5000)
          }
        )
        suggestionService = new SuggestionService(chain, (isGenerating) => {
          isGeneratingSuggestion = isGenerating
        })
        setSuggestionService(suggestionService)
      }

      initChain()
    } else if (!provider && error) {
      console.warn('[DocumentEditor] Provider error:', error)
      if (type === 'ollama' && $providerState.apiKey) {
        console.log('[DocumentEditor] Attempting fallback to OpenRouter...')
        switchProvider('openrouter', $providerState.apiKey)
      }
    }
  })

  let loadedDocId: string | null = null

  $effect.pre(() => {
    const docId = $selectedDocumentId
    const doc = $currentDocument
    setCursorDoc(docId)

    if (docId !== loadedDocId) {
      if (doc) {
        loadedDocId = docId
        lastLoadedContent = doc.content
        content = doc.content
        currentLinks = $documentLinks.get(doc.id) ?? []
      } else if (!docId) {
        loadedDocId = null
        lastLoadedContent = ''
        content = ''
        currentLinks = []
      }
    }
  })

  $effect(() => {
    const newContent = content
    if (newContent === lastLoadedContent) return
    if (!$selectedDocumentId || !$currentDocument) return

    if (autoSaveTimeout) clearTimeout(autoSaveTimeout)
    autoSaveTimeout = setTimeout(() => {
      handleAutoSave(newContent)
    }, 300)
  })

  $effect(() => {
    const newContent = content
    const papersList = $papers
    if (validationTimeout) clearTimeout(validationTimeout)
    validationTimeout = setTimeout(() => {
      const { links } = validateAndGetLinks(newContent, papersList)
      currentLinks = links
      if ($selectedDocumentId) {
        updateLinks($selectedDocumentId, links)
      }
    }, 100)
  })

  $effect(() => {
    if (!$selectedDocumentId) {
      clearSidebar()
    }
  })

  // Listen for click-to-insert events from the sidebar
  $effect(() => {
    function handleSuggestionInsert(e: Event) {
      const event = e as CustomEvent<{ type: string; item: any; text: string }>
      const { type, text } = event.detail
      if (type !== 'paper' && type !== 'completion') return
      if (!text) return

      const pos = cursorPosition
      content = content.slice(0, pos) + text + content.slice(pos)

      const provider = event.detail.item?.provider || (type === 'paper' ? 'paper-keyword' : 'llm')
      recordInsertion($selectedDocumentId || '', provider, type)
    }

    window.addEventListener('suggestion-insert', handleSuggestionInsert)
    return () => window.removeEventListener('suggestion-insert', handleSuggestionInsert)
  })

  async function handleAutoSave(newContent: string) {
    const ws = $workspace
    const docId = $selectedDocumentId
    const doc = $currentDocument
    if (!ws || !docId || !doc) return

    try {
      await saveDocumentWithLinks(ws.path, docId, doc.title, newContent, currentLinks, doc.createdAt)
      lastLoadedContent = newContent
      console.log(`[DocumentEditor] Saved ${docId}`)
    } catch (err) {
      console.error(`[DocumentEditor] Save failed:`, err)
    }
  }
</script>

<div class="document-editor">
  {#if !$selectedDocumentId}
    <div class="empty-state">
      <div class="empty-icon">📄</div>
      <h2>No document selected</h2>
      <p>Select a document from the sidebar to open it in the editor.</p>
    </div>
  {:else if !$currentDocument}
    <div class="loading-state">
      <p>Loading document...</p>
    </div>
  {:else}
    <div class="editor-main">
      <NotesEditor
        type="document"
        id={$selectedDocumentId}
        title={$currentDocument.title}
        bind:content
        onChange={() => {}}
        onBlur={() => handleAutoSave(content)}
        onCursorChange={handleCursorMove}
      />
    </div>
  {/if}
</div>

<style>
  .document-editor {
    display: flex;
    flex-direction: column;
    height: 100%;
    width: 100%;
    background: var(--color-surface-0);
    overflow: hidden;
  }

  .editor-main {
    flex: 1;
    min-width: 0;
    overflow: hidden;
    display: flex;
    flex-direction: column;
  }

  .empty-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    width: 100%;
    height: 100%;
    text-align: center;
    max-width: 380px;
    padding: 2rem;
    margin: auto;
  }

  .empty-icon {
    font-size: 2.5rem;
    margin-bottom: 0.875rem;
    opacity: 0.45;
  }

  .empty-state h2 {
    font-size: 1.25rem;
    font-weight: 600;
    color: var(--color-text);
    margin: 0 0 0.4rem 0;
  }

  .empty-state p {
    font-size: 0.9rem;
    color: var(--color-text-secondary);
    line-height: 1.55;
    margin: 0;
  }

  .loading-state {
    display: flex;
    align-items: center;
    justify-content: center;
    height: 100%;
    color: var(--color-text-secondary);
    font-size: 14px;
  }
</style>
