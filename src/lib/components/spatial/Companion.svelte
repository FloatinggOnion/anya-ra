<script lang="ts">
  import Icon from '../Icon.svelte'
  import { onMount, onDestroy } from 'svelte'
  import ProviderSettings from '../chat/ProviderSettings.svelte'
  import { get } from 'svelte/store'
  import { providerState, initializeProvider } from '../../stores/llm-provider'
  import { settings } from '../../stores/settings'
  import { graphNodes, graphEdges, graphViewport, addCanvasNode, persistGraph, removeCanvasNodes } from '../../stores/graph'
  import { canvasSelection, openCanvasObject, researchGoal, researchProposals, acceptedProposals } from '../../stores/spatial'
  import { papers } from '../../stores/papers'
  import { documents } from '../../stores/documents'
  import { buildCanvasContext, proposeResearch, nodeTitle, type ResearchProposal } from '../../services/socratic'

  let goal = $state(get(researchGoal))
  let busy = $state(false)
  let error = $state('')
  let proposals = $state<ResearchProposal[]>(get(researchProposals))
  let accepted = $state<Record<string, string>>(get(acceptedProposals))
  $effect(() => { researchGoal.set(goal); researchProposals.set(proposals); acceptedProposals.set(accepted) })
  let controller: AbortController | null = null
  onMount(() => { void initializeProvider() })
  onDestroy(() => controller?.abort())

  async function propose() {
    const provider = $providerState.provider
    if (!provider || !goal.trim() || busy) return
    controller?.abort()
    const request = new AbortController()
    controller = request
    busy = true; error = ''
    const context = buildCanvasContext($graphNodes, $graphEdges, $canvasSelection, $papers, $documents)
    const validIds = new Set($graphNodes.filter(n => context.includes(`[${n.id}]`)).map(n => n.id))
    const model = $providerState.type === 'ollama' ? $settings.suggestions.ollamaModel : $providerState.type === 'llamacpp' ? $settings.suggestions.llamaCppModel : $settings.suggestions.openrouterModel
    try {
      const result = await proposeResearch(provider, goal, context, validIds, { model: model || undefined, maxTokens: 1800, temperature: .4 }, request.signal)
      if (!request.signal.aborted) { proposals = result; accepted = {} }
    } catch (e) {
      if (!request.signal.aborted) error = e instanceof Error ? e.message : 'Could not prepare proposals.'
    } finally {
      if (controller === request) busy = false
    }
  }
  function accept(proposal: ResearchProposal) {
    if (accepted[proposal.id] && $graphNodes.some(n => n.id === accepted[proposal.id])) return
    const sources = $graphNodes.filter(n => proposal.sourceIds.includes(n.id))
    const anchor = sources[0]?.position
    const position = anchor ? { x: anchor.x + 360, y: anchor.y + Object.keys(accepted).length * 240 } : undefined
    const id = addCanvasNode(proposal.kind === 'search'
      ? { kind: 'search', query: proposal.title }
      : { kind: 'concept', role: proposal.kind, label: proposal.title, body: proposal.body }, position)
    graphEdges.update(edges => [...edges, ...sources.map(source => ({
      id: `proposal-${source.id}-${id}`, source: source.id, target: id, type: 'typed', data: { type: 'related' as const },
    }))])
    persistGraph(get(graphViewport))
    accepted = { ...accepted, [proposal.id]: id }
  }
  function undo(proposal: ResearchProposal) {
    removeCanvasNodes([accepted[proposal.id]])
    const next = { ...accepted }; delete next[proposal.id]; accepted = next
  }
</script>

<div class="companion">
  <ProviderSettings />
  <div class="intro"><span class="mark"><Icon name="think" size={32} /></span><h2>A thought, taken further.</h2><p>What are you trying to understand, apply, or create?</p></div>
  <form onsubmit={e => { e.preventDefault(); propose() }}>
    <label for="research-goal">Your next move</label>
    <textarea id="research-goal" bind:value={goal} rows={3} placeholder="How could I apply these findings to my project?" disabled={busy}></textarea>
    <p class="context">{$canvasSelection.length ? `${$canvasSelection.length} selected object(s) and their connections inform these proposals.` : 'Select objects on the canvas to include evidence. Shift-click to select several.'}</p>
    <button class="primary" disabled={busy || !goal.trim() || !$providerState.provider}>{busy ? 'Considering next steps…' : 'Propose next steps'}</button>
    {#if busy}<button type="button" onclick={() => { controller?.abort(); busy = false }}>Cancel</button>{/if}
  </form>
  {#if !$providerState.provider}<p class="context">Configure an AI provider in Settings to generate proposals.</p>{/if}
  {#if error}<p class="error" role="alert">{error}</p>{/if}
  {#if proposals.length}<p class="proposal-notice">Proposals for your review. Accepting adds a linked canvas object; your writing stays under your control.</p>{/if}
  {#each proposals as proposal (proposal.id)}
    <article class="proposal">
      <span class="kind">Proposed {proposal.kind}</span><h3>{proposal.title}</h3><p>{proposal.body}</p>
      {#if proposal.sourceIds.length}<small>Context: {proposal.sourceIds.map(id => { const source = $graphNodes.find(n => n.id === id); return source ? nodeTitle(source.data) : 'Removed object' }).join(' · ')}</small>{:else}<small>Exploratory · no source evidence attached</small>{/if}
      <div class="actions">
        {#if accepted[proposal.id] && $graphNodes.some(n => n.id === accepted[proposal.id])}
          <button onclick={() => openCanvasObject(accepted[proposal.id])}>Open object <Icon name="arrow-up-right" size={14} /></button><button onclick={() => undo(proposal)}>Undo</button>
        {:else}
          <button onclick={() => accept(proposal)}>Accept onto canvas</button><button onclick={() => { proposals = proposals.filter(p => p.id !== proposal.id) }}>Dismiss</button>
        {/if}
      </div>
    </article>
  {/each}
</div>

<style>
  .companion { padding: var(--space-lg); overflow-y: auto; height: 100%; }
  .mark { font-size: 32px; color: var(--color-accent); }
  h2 { font: 400 28px/1.2 var(--font-display); margin: 12px 0; }
  p { font-size: var(--text-sm); line-height: 1.75; color: var(--color-text-secondary); }
  form { margin: 28px 0; } label { display: block; font-size: var(--text-sm); margin-bottom: 8px; }
  textarea { width: 100%; padding: 12px; background: var(--color-bg); border: 1px solid var(--color-border-strong); border-radius: var(--radius-input); color: var(--color-text); resize: vertical; font-size: var(--text-sm); line-height: 1.7; }
  .context, .proposal-notice, small { font-size: var(--text-xs); color: var(--color-text-muted); line-height: 1.7; }
  button { padding: 9px 12px; border: 1px solid var(--color-border); border-radius: var(--radius-input); background: var(--color-surface); color: var(--color-text); cursor: pointer; font-size: var(--text-sm); }
  button:hover:not(:disabled) { background: var(--color-surface-2); }
  .primary { background: var(--color-accent); color: var(--color-on-accent); }
  .primary:hover:not(:disabled) { background: var(--color-accent-hover); }
  .proposal { border-top: 1px solid var(--color-border); padding: 24px 0; }
  .kind { font-size: var(--text-xs); color: var(--color-accent); }
  h3 { font: 400 21px/1.4 var(--font-display); margin: 8px 0; }
  .actions { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 16px; }
  .error { color: var(--color-error); }
</style>
