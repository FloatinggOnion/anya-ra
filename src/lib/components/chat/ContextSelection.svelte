<!-- ContextSelection.svelte — Context item picker with token usage meter -->
<script lang="ts">
  import {
    contextState,
    selectedItems,
    totalTokens,
    toggleContextItem,
    clearContext,
    selectAll
  } from '../../stores/context-selection'
  import { getModelContextWindow, getTokenUsageLevel } from '../../services/tokenizer'

  // Hardcode qwen2:0.5b for Phase 4 — model selection UI comes later
  const contextWindow = getModelContextWindow('qwen2:0.5b')

  let showContextPanel = $state(false)

  const usagePercent = $derived(($totalTokens / contextWindow.limit) * 100)
  const usageLevel = $derived(getTokenUsageLevel($totalTokens, contextWindow.limit))
</script>

<div class="context-selection">
  <button class="toggle" onclick={() => (showContextPanel = !showContextPanel)}>
    <span class="icon">📚</span>
    <span class="label">
      Context: {$selectedItems.length} item{$selectedItems.length === 1 ? '' : 's'}
    </span>
    <span class="tokens {usageLevel}">
      {$totalTokens.toLocaleString()} / {contextWindow.limit.toLocaleString()} tokens
    </span>
    <span class="toggle-icon">{showContextPanel ? '▼' : '▶'}</span>
  </button>

  {#if showContextPanel}
    <div class="context-panel">
      <div class="panel-header">
        <h3>Select Context</h3>
        <div class="actions">
          <button class="text-btn" onclick={selectAll}>Select All</button>
          <button class="text-btn" onclick={clearContext}>Clear</button>
        </div>
      </div>

      <div class="token-meter">
        <div class="meter-bar">
          <div
            class="meter-fill {usageLevel}"
            style="width: {Math.min(usagePercent, 100)}%"
          ></div>
        </div>
        <div class="meter-label">
          {usagePercent.toFixed(1)}% of context window used
        </div>
      </div>

      {#if usageLevel === 'warning'}
        <div class="warning-msg">
          ⚠️ Context usage is high. Consider deselecting some items.
        </div>
      {/if}

      {#if usageLevel === 'danger'}
        <div class="danger-msg">
          🚫 Context exceeds 90% — deselect items before sending.
        </div>
      {/if}

      <div class="items-list">
        {#each $contextState.availableItems as item (item.id)}
          <label class="item">
            <input
              type="checkbox"
              checked={$contextState.selectedIds.has(item.id)}
              onchange={() => toggleContextItem(item.id)}
            />
            <div class="item-content">
              <div class="item-header">
                <span class="item-type">{item.type}</span>
                <span class="item-title">{item.title}</span>
              </div>
              <div class="item-tokens">{item.tokens.toLocaleString()} tokens</div>
            </div>
          </label>
        {/each}
      </div>
    </div>
  {/if}
</div>

<style>
  .context-selection {
    padding: 8px;
    border-bottom: 1px solid var(--color-border);
    flex-shrink: 0;
  }

  .toggle {
    width: 100%;
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 8px 12px;
    background: var(--color-surface);
    border: 1px solid var(--color-border);
    border-radius: 6px;
    color: var(--color-text);
    cursor: pointer;
    font-size: 13px;
    transition: background 0.15s;
  }

  .toggle:hover {
    background: var(--color-border);
  }

  .icon {
    font-size: 16px;
    flex-shrink: 0;
  }

  .label {
    flex: 1;
    text-align: left;
    font-weight: 500;
  }

  .tokens {
    font-size: 11px;
    font-family: monospace;
  }

  .tokens.safe {
    color: #4ade80;
  }
  .tokens.warning {
    color: #fbbf24;
  }
  .tokens.danger {
    color: #f87171;
  }

  .toggle-icon {
    font-size: 10px;
    color: var(--color-text-muted);
  }

  .context-panel {
    margin-top: 8px;
    padding: 12px;
    background: var(--color-surface);
    border: 1px solid var(--color-border);
    border-radius: 6px;
    max-height: 380px;
    overflow-y: auto;
  }

  .panel-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 12px;
  }

  .panel-header h3 {
    margin: 0;
    font-size: 13px;
    font-weight: 600;
  }

  .actions {
    display: flex;
    gap: 8px;
  }

  .text-btn {
    padding: 3px 8px;
    background: transparent;
    border: 1px solid var(--color-border);
    border-radius: 4px;
    color: var(--color-accent);
    cursor: pointer;
    font-size: 11px;
    transition: background 0.1s;
  }

  .text-btn:hover {
    background: var(--color-bg);
  }

  .token-meter {
    margin-bottom: 8px;
  }

  .meter-bar {
    height: 6px;
    background: var(--color-bg);
    border-radius: 3px;
    overflow: hidden;
  }

  .meter-fill {
    height: 100%;
    transition:
      width 0.3s ease,
      background-color 0.3s ease;
    border-radius: 3px;
  }

  .meter-fill.safe {
    background: #4ade80;
  }
  .meter-fill.warning {
    background: #fbbf24;
  }
  .meter-fill.danger {
    background: #f87171;
  }

  .meter-label {
    margin-top: 4px;
    font-size: 11px;
    text-align: right;
    color: var(--color-text-muted);
  }

  .warning-msg,
  .danger-msg {
    padding: 6px 10px;
    border-radius: 4px;
    font-size: 12px;
    margin-bottom: 8px;
  }

  .warning-msg {
    background: rgba(251, 191, 36, 0.15);
    border: 1px solid #fbbf24;
    color: #fbbf24;
  }

  .danger-msg {
    background: rgba(248, 113, 113, 0.15);
    border: 1px solid #f87171;
    color: #f87171;
  }

  .items-list {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }

  .item {
    display: flex;
    gap: 8px;
    align-items: flex-start;
    padding: 8px;
    background: var(--color-bg);
    border-radius: 4px;
    cursor: pointer;
    transition: background 0.1s;
  }

  .item:hover {
    background: var(--color-border);
  }

  .item input {
    margin-top: 2px;
    flex-shrink: 0;
  }

  .item-content {
    flex: 1;
    min-width: 0;
  }

  .item-header {
    display: flex;
    gap: 6px;
    align-items: center;
    flex-wrap: wrap;
  }

  .item-type {
    font-size: 10px;
    text-transform: uppercase;
    padding: 1px 5px;
    background: var(--color-accent);
    color: white;
    border-radius: 3px;
    font-weight: 700;
    letter-spacing: 0.5px;
    flex-shrink: 0;
  }

  .item-title {
    font-size: 12px;
    font-weight: 500;
    color: var(--color-text);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .item-tokens {
    font-size: 11px;
    color: var(--color-text-muted);
    margin-top: 2px;
  }
</style>
