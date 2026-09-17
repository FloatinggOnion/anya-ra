<script lang="ts">
  import { onMount } from 'svelte'
  import { settings, updateSettings, loadSettings, resetSettings } from '../stores/settings'
  import type { Settings } from '../stores/settings'

  let { isOpen = $bindable(false) } = $props<{ isOpen?: boolean }>()

  type Tab = 'general' | 'appearance' | 'workspace' | 'editor' | 'shortcuts' | 'advanced'
  let activeTab = $state<Tab>('general')
  let dialogEl = $state<HTMLDivElement | null>(null)

  const tabs: { id: Tab; label: string }[] = [
    { id: 'general', label: 'General' },
    { id: 'appearance', label: 'Appearance' },
    { id: 'workspace', label: 'Workspace' },
    { id: 'editor', label: 'Editor' },
    { id: 'shortcuts', label: 'Shortcuts' },
    { id: 'advanced', label: 'Advanced' },
  ]

  function close() {
    isOpen = false
  }

  function handleOverlayClick(e: MouseEvent) {
    if (e.target === e.currentTarget) close()
  }

  function handleKeydown(e: KeyboardEvent) {
    if (e.key === 'Escape') {
      close()
      return
    }
    // Basic focus trap: keep Tab cycling inside the dialog
    if (e.key === 'Tab' && dialogEl) {
      const focusable = dialogEl.querySelectorAll<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
      )
      if (focusable.length === 0) return
      const first = focusable[0]
      const last = focusable[focusable.length - 1]
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault()
        last.focus()
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault()
        first.focus()
      }
    }
  }

  $effect(() => {
    if (isOpen) {
      loadSettings().catch(() => {})
      activeTab = 'general'
      queueMicrotask(() => dialogEl?.querySelector<HTMLElement>('button')?.focus())
    }
  })

  onMount(() => {
    window.addEventListener('keydown', handleKeydown)
    return () => window.removeEventListener('keydown', handleKeydown)
  })

  function update(patch: Parameters<typeof updateSettings>[0]) {
    updateSettings(patch)
  }
</script>

{#if isOpen}
  <div class="modal-overlay" onclick={handleOverlayClick}>
    <div
      class="modal"
      role="dialog"
      aria-modal="true"
      aria-label="Settings"
      bind:this={dialogEl}
      onclick={e => e.stopPropagation()}
    >
      <div class="modal-header">
        <h2>⚙️ Settings</h2>
        <button class="close-btn" onclick={close} aria-label="Close settings">✕</button>
      </div>

      <div class="tabs" role="tablist">
        {#each tabs as tab}
          <button
            role="tab"
            aria-selected={activeTab === tab.id}
            class="tab"
            class:active={activeTab === tab.id}
            onclick={() => (activeTab = tab.id)}
          >
            {tab.label}
          </button>
        {/each}
      </div>

      <div class="tab-body">
        {#if activeTab === 'general'}
          <label>
            Auto-save delay (ms)
            <input
              type="number"
              min={100}
              step={100}
              value={$settings.general.autoSaveMs}
              oninput={e => update({ general: { autoSaveMs: Number((e.target as HTMLInputElement).value) } })}
            />
          </label>
          <label>
            Font size
            <input
              type="number"
              min={10}
              max={24}
              value={$settings.general.fontSize}
              oninput={e => update({ general: { fontSize: Number((e.target as HTMLInputElement).value) } })}
            />
          </label>
        {:else if activeTab === 'appearance'}
          <label>
            Theme
            <select
              value={$settings.appearance.theme}
              onchange={e => update({ appearance: { theme: (e.target as HTMLSelectElement).value as Settings['appearance']['theme'] } })}
            >
              <option value="light">Light</option>
              <option value="dark">Dark</option>
              <option value="auto">Auto</option>
            </select>
          </label>
          <label>
            Density
            <select
              value={$settings.appearance.density}
              onchange={e => update({ appearance: { density: (e.target as HTMLSelectElement).value as Settings['appearance']['density'] } })}
            >
              <option value="comfortable">Comfortable</option>
              <option value="compact">Compact</option>
            </select>
          </label>
        {:else if activeTab === 'workspace'}
          <label>
            Default LLM provider
            <select
              value={$settings.workspace.defaultProvider}
              onchange={e => update({ workspace: { defaultProvider: (e.target as HTMLSelectElement).value as Settings['workspace']['defaultProvider'] } })}
            >
              <option value="ollama">Ollama</option>
              <option value="openrouter">OpenRouter</option>
            </select>
          </label>
          <label class="check">
            <input
              type="checkbox"
              checked={$settings.workspace.exportIncludePdfs}
              onchange={e => update({ workspace: { exportIncludePdfs: (e.target as HTMLInputElement).checked } })}
            />
            Include PDFs in workspace export
          </label>
        {:else if activeTab === 'editor'}
          <label>
            Tab size
            <input
              type="number"
              min={1}
              max={8}
              value={$settings.editor.tabSize}
              oninput={e => update({ editor: { tabSize: Number((e.target as HTMLInputElement).value) } })}
            />
          </label>
          <label class="check">
            <input
              type="checkbox"
              checked={$settings.editor.wordWrap}
              onchange={e => update({ editor: { wordWrap: (e.target as HTMLInputElement).checked } })}
            />
            Word wrap
          </label>
          <label class="check">
            <input
              type="checkbox"
              checked={$settings.editor.lineNumbers}
              onchange={e => update({ editor: { lineNumbers: (e.target as HTMLInputElement).checked } })}
            />
            Line numbers
          </label>
        {:else if activeTab === 'shortcuts'}
          <p class="placeholder">Shortcut customization coming soon.</p>
        {:else}
          <p class="hint">Settings version {$settings.version}. Stored cross-workspace via tauri-plugin-store.</p>
          <button class="reset-btn" onclick={() => resetSettings()}>Reset to defaults</button>
        {/if}
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
    width: 560px;
    max-width: 90vw;
    max-height: 80vh;
    display: flex;
    flex-direction: column;
    box-shadow: 0 20px 60px rgba(0, 0, 0, 0.4);
  }

  .modal-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 16px 20px;
    border-bottom: 1px solid var(--color-surface-2);
  }

  .modal-header h2 {
    margin: 0;
    font-size: 16px;
    font-weight: 600;
    color: var(--color-text);
  }

  .close-btn {
    background: none;
    border: none;
    color: var(--color-text-secondary);
    font-size: 18px;
    cursor: pointer;
    padding: 4px;
  }

  .close-btn:hover {
    color: var(--color-text);
  }

  .tabs {
    display: flex;
    gap: 4px;
    padding: 12px 20px 0;
    border-bottom: 1px solid var(--color-surface-2);
  }

  .tab {
    background: none;
    border: none;
    border-bottom: 2px solid transparent;
    color: var(--color-text-secondary);
    cursor: pointer;
    font-size: 13px;
    padding: 8px 12px;
  }

  .tab.active {
    border-bottom-color: var(--color-primary, #0a84ff);
    color: var(--color-text);
    font-weight: 600;
  }

  .tab-body {
    display: flex;
    flex-direction: column;
    gap: 12px;
    padding: 20px;
    overflow-y: auto;
  }

  label {
    display: flex;
    flex-direction: column;
    gap: 6px;
    font-size: 13px;
    color: var(--color-text);
  }

  label.check {
    flex-direction: row;
    align-items: center;
    gap: 8px;
  }

  input[type='number'],
  select {
    background: var(--color-surface-0);
    border: 1px solid var(--color-surface-3);
    border-radius: 4px;
    color: var(--color-text);
    padding: 6px 8px;
    font-size: 13px;
  }

  .placeholder,
  .hint {
    font-size: 13px;
    color: var(--color-text-secondary);
    margin: 0;
  }

  .reset-btn {
    align-self: flex-start;
    background: var(--color-surface-2);
    border: 1px solid var(--color-surface-3);
    border-radius: 4px;
    color: var(--color-text);
    cursor: pointer;
    padding: 6px 12px;
    font-size: 13px;
  }
</style>
