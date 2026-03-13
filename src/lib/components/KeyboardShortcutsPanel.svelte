<script lang="ts">
  import { KEYBOARD_SHORTCUTS } from '../config/keyboard-shortcuts'
  import type { KeyboardShortcut } from '../config/keyboard-shortcuts'

  let { isOpen = false } = $props()

  const grouped = $derived.by(() => {
    const map = new Map<string, KeyboardShortcut[]>()
    for (const shortcut of KEYBOARD_SHORTCUTS) {
      if (!map.has(shortcut.category)) {
        map.set(shortcut.category, [])
      }
      map.get(shortcut.category)!.push(shortcut)
    }
    return map
  })

  const categories = ['global', 'editor', 'graph', 'search'] as const
  const categoryLabels: Record<string, string> = {
    global: 'Global',
    editor: 'Notes Editor',
    graph: 'Graph',
    search: 'Search',
  }
</script>

{#if isOpen}
  <div class="modal-overlay" onclick={() => (isOpen = false)}>
    <div class="modal" onclick={e => e.stopPropagation()}>
      <div class="modal-header">
        <h2>⌨️ Keyboard Shortcuts</h2>
        <button class="close-btn" onclick={() => (isOpen = false)}>✕</button>
      </div>

      <div class="shortcuts-grid">
        {#each categories as category}
          {#if grouped.has(category)}
            <div class="category">
              <h3>{categoryLabels[category]}</h3>
              <div class="shortcuts-list">
                {#each grouped.get(category) || [] as shortcut}
                  <div class="shortcut-item">
                    <div class="keys">
                      {#each shortcut.keys as key (key)}
                        <span class="key">{key}</span>
                      {/each}
                    </div>
                    <span class="description">{shortcut.description}</span>
                  </div>
                {/each}
              </div>
            </div>
          {/if}
        {/each}
      </div>

      <div class="modal-footer">
        <p class="hint">💡 Tip: Press <span class="key">Esc</span> to close this panel</p>
      </div>
    </div>
  </div>
{/if}

<style>
  .modal-overlay {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0, 0, 0, 0.5);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 9999;
  }

  .modal {
    background: var(--color-surface-1);
    border: 1px solid var(--color-surface-2);
    border-radius: 8px;
    max-width: 600px;
    max-height: 80vh;
    overflow-y: auto;
    box-shadow: 0 20px 60px rgba(0, 0, 0, 0.4);
    display: flex;
    flex-direction: column;
  }

  .modal-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 20px;
    border-bottom: 1px solid var(--color-surface-2);
    flex-shrink: 0;
  }

  .modal-header h2 {
    margin: 0;
    font-size: 18px;
    font-weight: 600;
    color: var(--color-text);
  }

  .close-btn {
    background: none;
    border: none;
    color: var(--color-text-secondary);
    font-size: 20px;
    cursor: pointer;
    padding: 4px;
    transition: color 0.15s;
  }

  .close-btn:hover {
    color: var(--color-text);
  }

  .shortcuts-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
    gap: 24px;
    padding: 20px;
    flex: 1;
    overflow-y: auto;
  }

  .category {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  .category h3 {
    margin: 0;
    font-size: 13px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: var(--color-text-secondary);
  }

  .shortcuts-list {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .shortcut-item {
    display: flex;
    gap: 12px;
    align-items: baseline;
  }

  .keys {
    display: flex;
    gap: 4px;
    min-width: 100px;
    flex-shrink: 0;
  }

  .key {
    background: var(--color-surface-2);
    border: 1px solid var(--color-surface-3);
    border-radius: 3px;
    padding: 2px 6px;
    font-family: monospace;
    font-size: 11px;
    font-weight: 500;
    color: var(--color-text-secondary);
  }

  .description {
    font-size: 13px;
    color: var(--color-text);
    flex: 1;
  }

  .modal-footer {
    padding: 16px 20px;
    border-top: 1px solid var(--color-surface-2);
    background: var(--color-surface-0);
    flex-shrink: 0;
  }

  .modal-footer .hint {
    margin: 0;
    font-size: 12px;
    color: var(--color-text-secondary);
  }

  .hint .key {
    padding: 2px 4px;
    font-size: 10px;
  }
</style>
