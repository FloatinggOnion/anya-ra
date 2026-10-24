<script lang="ts">
  import Icon from '../Icon.svelte'
  import { Handle, Position, type NodeProps } from '@xyflow/svelte'
  import type { GraphNode } from '../../types/graph'
  import { documents } from '../../stores/documents'
  import { papers } from '../../stores/papers'
  import { openCanvasObject } from '../../stores/spatial'
  let { id, data, selected }: NodeProps<GraphNode> = $props()
  const label = $derived(data.kind === 'concept' ? data.role ?? 'concept' : data.kind === 'search' ? 'saved search' : data.kind === 'chat' ? 'conversation' : data.kind)
  const title = $derived(data.kind === 'paper' ? $papers.find(p => p.id === data.paperId)?.title ?? data.title
    : data.kind === 'document' ? $documents.get(data.documentId)?.title ?? data.title
    : data.kind === 'concept' ? data.label : data.kind === 'note' ? 'Working note' : data.kind === 'search' ? data.query : data.title)
  const body = $derived(data.kind === 'paper' ? `${data.authors.slice(0, 2).join(', ')}${data.year ? ` · ${data.year}` : ''}`
    : data.kind === 'document' ? $documents.get(data.documentId)?.content.slice(0, 180) ?? 'Document unavailable'
    : data.kind === 'concept' || data.kind === 'note' ? data.body : data.kind === 'chat' ? 'Explore this thread with Anya.' : 'Find evidence for this line of inquiry.')
</script>

<article class="object" class:selected class:question={data.kind === 'concept' && data.role === 'question'}>
  <Handle type="target" position={Position.Left} />
  <div class="kind">{label}</div>
  <h3>{title}</h3>
  {#if body}<p>{body}</p>{/if}
  <button class="nodrag nopan" onclick={() => openCanvasObject(id)} aria-label="Open {title}">Open <Icon name="arrow-up-right" size={14} /></button>
  <Handle type="source" position={Position.Right} />
</article>

<style>
  .object { width: 268px; padding: var(--space-md) 20px 12px; background: var(--color-surface); color: var(--color-text); border: 1px solid var(--color-border-strong); border-radius: var(--radius-card); box-shadow: 0 3px 12px var(--color-shadow); }
  .object.selected { outline: 2px solid var(--color-accent); outline-offset: 3px; }
  .question { background: var(--color-accent-subtle); }
  .kind { font-size: var(--text-xs); color: var(--color-accent); text-transform: capitalize; margin-bottom: 10px; }
  h3 { font-family: var(--font-display); font-size: var(--text-lg); line-height: 1.3; font-weight: 500; margin: 0; overflow-wrap: anywhere; }
  p { font-size: var(--text-sm); color: var(--color-text-secondary); line-height: 1.6; white-space: pre-wrap; display: -webkit-box; -webkit-line-clamp: 4; line-clamp: 4; -webkit-box-orient: vertical; overflow: hidden; margin: 10px 0; }
  button { display: flex; justify-content: space-between; width: 100%; margin-top: 16px; padding: 8px 0 0; border: 0; border-top: 1px solid var(--color-border); background: transparent; color: var(--color-text-secondary); font-size: var(--text-xs); cursor: pointer; text-align: left; }
  button:hover { color: var(--color-accent); }
  :global(.svelte-flow__handle) { background: var(--color-surface); border: 1px solid var(--color-accent); width: 8px; height: 8px; }
</style>
