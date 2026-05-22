<script lang="ts">
  import { get } from 'svelte/store'
  import { papers } from '../../stores/papers'
  import { settings } from '../../stores/settings'
  import { setSidebarLayout } from '../../stores/settings'
  import type { SuggestionService } from '../../services/suggestions'
  import type { SidebarSuggestionItem, PaperMatch } from '../../types/suggestion'
  import { PaperKeywordMatcher } from '../../services/paper-keyword-matcher'
  import { SectionBoundaryDetector } from '../../services/section-boundary-detector'
  import {
    setPaperMatches, setIdeas, setCompletions, setGenerating, clearAll
  } from '../../stores/suggestion-sidebar'
  import { generateCitation } from '../../services/smart-citation-insert'

  interface Props {
    docId: string
    content: string
    cursorPos: number
    suggestionService: SuggestionService | null
  }

  let { docId, content = '', cursorPos = 0, suggestionService = null }: Props = $props()

  // ── Local reactive state (drives UI directly) ──────────────────────────
  let papersLocal = $state<SidebarSuggestionItem[]>([])
  let ideasLocal = $state<SidebarSuggestionItem[]>([])
  let completionsLocal = $state<SidebarSuggestionItem[]>([])
  let isGenerating = $state(false)

  let layoutMode = $state<'sectioned' | 'unified'>('sectioned')
  let sectionsCollapsed = $state({ papers: false, ideas: false, completions: false })
  let paperMatcher = $state<PaperKeywordMatcher | null>(null)
  let boundaryDetector = $state<SectionBoundaryDetector | null>(null)

  // Load saved layout preference on mount
  $effect(() => {
    layoutMode = get(settings).suggestions.sidebarLayout || 'sectioned'
  })

  // ── Initialize services and boundary detector ─────────────────────────
  $effect(() => {
    paperMatcher = new PaperKeywordMatcher()

    boundaryDetector = new SectionBoundaryDetector(
      async (event) => {
        if (!suggestionService) return
        isGenerating = true
        setGenerating(true)
        try {
          const [ideasResult, completionsResult] = await Promise.all([
            suggestionService.generateIdeas(event.docId, event.content, event.cursorPos),
            suggestionService.generateCompletions(event.docId, event.content, event.cursorPos),
          ])
          ideasLocal = ideasResult
          completionsLocal = completionsResult
          setIdeas(ideasResult)
          setCompletions(completionsResult)
        } catch (err) {
          console.error('[SuggestionsSidebar] Generation failed:', err)
        } finally {
          isGenerating = false
          setGenerating(false)
        }
      },
      () => content,
      () => docId
    )

    return () => {
      boundaryDetector?.cleanup()
      clearAll()
      papersLocal = []
      ideasLocal = []
      completionsLocal = []
      isGenerating = false
    }
  })

  // ── Continuous paper matching on content change (D-05 Tier 1) ─────────
  $effect(() => {
    const c = content
    const matcher = paperMatcher
    if (!c || c.length < 10 || !matcher) {
      papersLocal = []
      setPaperMatches([])
      return
    }
    const allPapers = get(papers)
    const matches = matcher.match(c, allPapers)
    const items: SidebarSuggestionItem[] = matches.slice(0, 5).map(m => ({
      id: `paper-${m.paperId}-${Date.now()}`,
      type: 'paper' as const,
      label: 'Papers',
      content: `${m.title}${m.year ? ` (${m.year})` : ''} — ${m.authors.slice(0, 3).join(', ')}`,
      timestamp: Date.now(),
      source: 'paper-keyword' as const,
      paper: { id: m.paperId, title: m.title, authors: m.authors, year: m.year, relevanceScore: m.relevanceScore }
    }))
    papersLocal = items
    // Also update global store for any other consumers
    setPaperMatches(matches)
  })

  // ── Feed content changes to boundary detector ─────────────────────────
  $effect(() => {
    const pos = cursorPos
    if (boundaryDetector) boundaryDetector.onContentChange(pos)
  })

  // ── Handlers ───────────────────────────────────────────────────────────

  function handleSuggest() {
    if (boundaryDetector) boundaryDetector.triggerManual(cursorPos)
  }

  function toggleLayout() {
    const newMode: 'sectioned' | 'unified' = layoutMode === 'sectioned' ? 'unified' : 'sectioned'
    layoutMode = newMode
    setSidebarLayout(newMode)
  }

  function handlePaperClick(item: SidebarSuggestionItem) {
    if (!item.paper) return
    const citationText = generateCitation(item)
    if (citationText) {
      window.dispatchEvent(new CustomEvent('suggestion-insert', {
        detail: { type: 'paper' as const, item, text: citationText }
      }))
      // Clear matches to prevent double-clicks
      papersLocal = []
      setPaperMatches([])
    }
  }

  function handleCompletionClick(item: SidebarSuggestionItem) {
    const insertText = item.content + ' '
    if (insertText) {
      window.dispatchEvent(new CustomEvent('suggestion-insert', {
        detail: { type: 'completion' as const, item, text: insertText }
      }))
      completionsLocal = []
      setCompletions([])
    }
  }
</script>

<div class="suggestions-sidebar" class:unified={layoutMode === 'unified'}>
  <!-- Header -->
  <div class="ss-header">
    <span class="ss-title">Suggestions</span>
    <button class="ss-suggest-btn" onclick={handleSuggest}>Suggest</button>
    <button class="ss-layout-toggle" onclick={toggleLayout} title="Toggle layout">
      {layoutMode === 'sectioned' ? '☰' : '⊞'}
    </button>
  </div>

  <!-- Papers Section (D-02) -->
  <div class="ss-section" class:collapsed={sectionsCollapsed.papers}>
    <button class="ss-section-header" onclick={() => sectionsCollapsed.papers = !sectionsCollapsed.papers}>
      📄 Papers <span class="ss-count">({papersLocal.length})</span>
      <span class="ss-chevron">▾</span>
    </button>
    <div class="ss-items">
      {#each papersLocal as item (item.id)}
        <button class="ss-card" onclick={() => handlePaperClick(item)}>
          {#if item.paper}
            <span class="ss-card-relevance" style="width: {(item.paper.relevanceScore * 100).toFixed(0)}%"></span>
          {/if}
          <span class="ss-card-text">{item.content}</span>
        </button>
      {/each}
      {#if papersLocal.length === 0}
        <div class="ss-empty">{content.length > 0 ? 'No relevant papers found' : 'Start writing to see paper matches'}</div>
      {/if}
    </div>
  </div>

  <!-- Ideas Section (D-02) -->
  <div class="ss-section" class:collapsed={sectionsCollapsed.ideas} class:generating={isGenerating && ideasLocal.length === 0}>
    <button class="ss-section-header" onclick={() => sectionsCollapsed.ideas = !sectionsCollapsed.ideas}>
      💡 Ideas &amp; Questions <span class="ss-count">({ideasLocal.length})</span>
      <span class="ss-chevron">▾</span>
    </button>
    <div class="ss-items">
      {#each ideasLocal as item (item.id)}
        <div class="ss-card">
          <span class="ss-card-text">{item.content}</span>
          {#if item.provider}
            <span class="ss-card-provider">{item.provider}</span>
          {/if}
        </div>
      {/each}
      {#if isGenerating && ideasLocal.length === 0}
        <div class="ss-loading">Generating ideas... <span class="spinner">⟳</span></div>
      {:else if ideasLocal.length === 0}
        <div class="ss-empty">Ideas appear at section breaks or click Suggest</div>
      {/if}
    </div>
  </div>

  <!-- Completions Section (D-02) -->
  <div class="ss-section" class:collapsed={sectionsCollapsed.completions} class:generating={isGenerating && completionsLocal.length === 0}>
    <button class="ss-section-header" onclick={() => sectionsCollapsed.completions = !sectionsCollapsed.completions}>
      ✏️ Text Completions <span class="ss-count">({completionsLocal.length})</span>
      <span class="ss-chevron">▾</span>
    </button>
    <div class="ss-items">
      {#each completionsLocal as item (item.id)}
        <button class="ss-card" onclick={() => handleCompletionClick(item)}>
          <span class="ss-card-text">{item.content}</span>
          {#if item.provider}
            <span class="ss-card-provider">{item.provider}</span>
          {/if}
        </button>
      {/each}
      {#if isGenerating && completionsLocal.length === 0}
        <div class="ss-loading">Generating completions... <span class="spinner">⟳</span></div>
      {:else if completionsLocal.length === 0}
        <div class="ss-empty">Completions appear at section breaks or click Suggest</div>
      {/if}
    </div>
  </div>
</div>
