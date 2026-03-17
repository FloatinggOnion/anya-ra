<script lang="ts">
  import PanelContent from './PanelContent.svelte'
  import {
    tabLabels,
    activeCenterTab,
    activeRightTab,
    centerCollapsed,
    rightCollapsed,
    centerTabs,
    rightTabs,
    activateTab,
    moveTab,
    toggleCollapse,
    type MovableTab,
    type PanelId
  } from '../../stores/panel-layout'

  interface Props {
    panelId: PanelId
    resolvedPdfPath: string | null
    PDFViewerComponent: any
    GraphCanvasComponent: any
  }

  let { panelId, resolvedPdfPath, PDFViewerComponent, GraphCanvasComponent }: Props = $props()

  // Pick the right stores depending on which column we are — use $derived
  // so Svelte 5 tracks the prop reference correctly through re-renders.
  const tabs = $derived(panelId === 'center' ? $centerTabs : $rightTabs)
  const activeTab = $derived(panelId === 'center' ? $activeCenterTab : $activeRightTab)
  const collapsed = $derived(panelId === 'center' ? $centerCollapsed : $rightCollapsed)

  // ─── Drag & Drop ────────────────────────────────────────────────────────────

  let isDragOver = $state(false)

  function onTabDragStart(e: DragEvent, tab: MovableTab) {
    e.dataTransfer!.effectAllowed = 'move'
    e.dataTransfer!.setData('application/anya-tab', JSON.stringify({ tab, fromPanel: panelId }))
  }

  function onDragOver(e: DragEvent) {
    // Only accept our own custom MIME type
    if (e.dataTransfer!.types.includes('application/anya-tab')) {
      e.preventDefault()
      e.dataTransfer!.dropEffect = 'move'
      isDragOver = true
    }
  }

  function onDragLeave(e: DragEvent) {
    // Only clear if we left the column entirely (not just moved to a child)
    if (!(e.currentTarget as HTMLElement).contains(e.relatedTarget as Node)) {
      isDragOver = false
    }
  }

  function onDrop(e: DragEvent) {
    e.preventDefault()
    isDragOver = false
    const raw = e.dataTransfer!.getData('application/anya-tab')
    if (!raw) return
    const { tab, fromPanel } = JSON.parse(raw) as { tab: MovableTab; fromPanel: PanelId }
    if (fromPanel !== panelId) {
      moveTab(tab, panelId)
    }
  }
</script>

<!-- svelte-ignore a11y_no_static_element_interactions -->
<div
  class="panel-column"
  class:drag-over={isDragOver}
  class:collapsed={collapsed}
  ondragover={onDragOver}
  ondragleave={onDragLeave}
  ondrop={onDrop}
  role="region"
  aria-label="{panelId} panel"
>
  <!-- ── Header ── -->
  <div class="panel-header">
    {#if !collapsed}
      <div class="tab-bar" role="tablist">
        {#each tabs as tab (tab)}
          <!-- svelte-ignore a11y_interactive_supports_focus -->
          <div
            class="tab-chip"
            class:active={activeTab === tab}
            draggable={true}
            role="tab"
            aria-selected={activeTab === tab}
            ondragstart={(e) => onTabDragStart(e, tab)}
            onclick={() => activateTab(tab)}
            onkeydown={(e) => (e.key === 'Enter' || e.key === ' ') && activateTab(tab)}
          >
            {tabLabels[tab]}
            <span
              class="move-hint"
              aria-label="Drag to move tab"
              title="Drag to move to other column"
            >⠿</span>
          </div>
        {/each}
      </div>
    {:else}
      <div class="collapsed-label">
        {panelId === 'center' ? '◀' : '▶'}
      </div>
    {/if}

    <button
      class="collapse-btn"
      onclick={() => toggleCollapse(panelId)}
      title={collapsed ? 'Expand column' : 'Collapse column'}
      aria-label={collapsed ? 'Expand column' : 'Collapse column'}
    >
      {#if panelId === 'center'}
        {collapsed ? '▶' : '◀'}
      {:else}
        {collapsed ? '◀' : '▶'}
      {/if}
    </button>
  </div>

  <!-- ── Content ── -->
  {#if !collapsed}
    <div class="tab-content" role="tabpanel">
      <PanelContent
        tab={activeTab}
        {resolvedPdfPath}
        {PDFViewerComponent}
        {GraphCanvasComponent}
      />
    </div>
  {/if}
</div>

<style>
  .panel-column {
    display: flex;
    flex-direction: column;
    min-width: 0;
    height: 100%;
    background: var(--color-bg, #0f0f0f);
    border: 1px solid var(--color-border, #2a2a2a);
    border-radius: 8px;
    overflow: hidden;
    transition: outline 0.1s;
  }

  .panel-column.drag-over {
    outline: 2px solid var(--color-accent, #6b9cff);
    outline-offset: -2px;
  }

  .panel-column.collapsed {
    flex: 0 0 36px;
    min-width: 36px;
    max-width: 36px;
  }

  /* ── Header ── */
  .panel-header {
    display: flex;
    align-items: center;
    gap: 4px;
    padding: 0 6px;
    height: 42px;
    flex-shrink: 0;
    border-bottom: 1px solid var(--color-border, #2a2a2a);
    background: var(--color-surface, #1a1a1a);
    overflow: hidden;
  }

  .tab-bar {
    display: flex;
    flex: 1;
    gap: 2px;
    overflow-x: auto;
    scrollbar-width: none;
    align-items: center;
  }

  .tab-bar::-webkit-scrollbar {
    display: none;
  }

  /* ── Tab chips ── */
  .tab-chip {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    padding: 5px 10px;
    border-radius: 6px;
    font-size: 12.5px;
    font-weight: 500;
    color: var(--color-text-secondary, #aaaaaa);
    cursor: pointer;
    white-space: nowrap;
    user-select: none;
    transition: background 0.1s, color 0.1s;
    border: 1px solid transparent;
  }

  .tab-chip:hover {
    background: var(--color-hover, #252525);
    color: var(--color-text, #f0f0f0);
  }

  .tab-chip.active {
    background: var(--color-surface-2, #222222);
    color: var(--color-accent, #6b9cff);
    border-color: var(--color-border, #2a2a2a);
  }

  .tab-chip[draggable='true'] {
    cursor: grab;
  }

  .tab-chip[draggable='true']:active {
    cursor: grabbing;
  }

  .move-hint {
    font-size: 10px;
    opacity: 0.35;
    pointer-events: none;
  }

  .tab-chip:hover .move-hint {
    opacity: 0.7;
  }

  /* ── Collapse button ── */
  .collapse-btn {
    flex-shrink: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    width: 24px;
    height: 24px;
    border-radius: 5px;
    border: 1px solid var(--color-border, #2a2a2a);
    background: transparent;
    color: var(--color-text-secondary, #aaaaaa);
    cursor: pointer;
    font-size: 11px;
    transition: background 0.1s, color 0.1s;
  }

  .collapse-btn:hover {
    background: var(--color-hover, #252525);
    color: var(--color-text, #f0f0f0);
  }

  .collapsed-label {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 11px;
    color: var(--color-text-secondary, #888);
  }

  /* ── Content area ── */
  .tab-content {
    flex: 1;
    overflow: hidden;
    display: flex;
    flex-direction: column;
    min-height: 0;
  }
</style>
