<script lang="ts">
  import { settings } from '../../stores/settings'

  let isOpen = $state(false)
  let activeTab = $state<'suggestions' | 'provider' | 'telemetry'>('suggestions')

  export function open() {
    isOpen = true
  }

  export function close() {
    isOpen = false
  }
</script>

{#if isOpen}
  <div class="settings-overlay" onclick={(e) => {
    if (e.target === e.currentTarget) close()
  }}>
    <dialog class="settings-dialog" open>
      <header class="settings-header">
        <h2>Settings</h2>
        <button class="close-button" onclick={() => close()}>×</button>
      </header>

      <div class="settings-tabs">
        <button
          class="tab-button"
          class:active={activeTab === 'suggestions'}
          onclick={() => (activeTab = 'suggestions')}
        >
          Suggestions
        </button>
        <button
          class="tab-button"
          class:active={activeTab === 'provider'}
          onclick={() => (activeTab = 'provider')}
        >
          LLM Provider
        </button>
        <button
          class="tab-button"
          class:active={activeTab === 'telemetry'}
          onclick={() => (activeTab = 'telemetry')}
        >
          Telemetry
        </button>
      </div>

      <div class="settings-content">
        {#if activeTab === 'suggestions'}
          <div class="preference-group">
            <label>
              <input
                type="checkbox"
                checked={$settings.suggestions.enabled}
                onchange={(e) => {
                  $settings.suggestions.enabled = e.currentTarget.checked
                }}
              />
              <span>Enable inline suggestions</span>
            </label>
          </div>
        {:else if activeTab === 'provider'}
          <div class="provider-group">
            <h3>Primary Provider</h3>
            <p>Current: <strong>{$settings.suggestions.llmProvider}</strong></p>
          </div>
        {:else if activeTab === 'telemetry'}
          <div class="telemetry-group">
            <label>
              <input
                type="checkbox"
                checked={$settings.suggestions.telemetryOptIn}
                onchange={(e) => {
                  $settings.suggestions.telemetryOptIn = e.currentTarget.checked
                }}
              />
              <span>Enable telemetry (local-only, opt-in)</span>
            </label>
          </div>
        {/if}
      </div>

      <footer class="settings-footer">
        <button class="button-primary" onclick={() => close()}>Done</button>
      </footer>
    </dialog>
  </div>
{/if}

<style>
  .settings-overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.5);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
  }

  .settings-dialog {
    background: var(--color-surface-0);
    border: 1px solid var(--color-surface-2);
    border-radius: 8px;
    width: 90%;
    max-width: 600px;
    max-height: 80vh;
    overflow: auto;
    display: flex;
    flex-direction: column;
  }

  .settings-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 16px;
    border-bottom: 1px solid var(--color-surface-2);
  }

  .settings-header h2 {
    margin: 0;
    font-size: 1.25rem;
  }

  .close-button {
    background: none;
    border: none;
    color: var(--color-text-secondary);
    font-size: 1.5rem;
    cursor: pointer;
    padding: 0;
    width: 32px;
    height: 32px;
  }

  .settings-tabs {
    display: flex;
    border-bottom: 1px solid var(--color-surface-2);
    gap: 0;
  }

  .tab-button {
    flex: 1;
    padding: 12px 16px;
    background: transparent;
    border: none;
    color: var(--color-text-secondary);
    cursor: pointer;
    font-size: 0.9rem;
    border-bottom: 2px solid transparent;
    transition: all 0.2s;
  }

  .tab-button.active {
    color: var(--color-accent);
    border-bottom-color: var(--color-accent);
  }

  .settings-content {
    flex: 1;
    padding: 24px;
    overflow-y: auto;
  }

  .preference-group,
  .provider-group,
  .telemetry-group {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  label {
    display: flex;
    align-items: center;
    gap: 8px;
    cursor: pointer;
  }

  input[type="checkbox"] {
    cursor: pointer;
  }

  h3 {
    margin: 0;
    font-size: 0.95rem;
    font-weight: 600;
  }

  p {
    margin: 8px 0 0 0;
    font-size: 0.9rem;
  }

  strong {
    color: var(--color-text);
  }

  .settings-footer {
    display: flex;
    justify-content: flex-end;
    gap: 12px;
    padding: 16px;
    border-top: 1px solid var(--color-surface-2);
  }

  .button-primary {
    background: var(--color-accent);
    color: white;
    border: none;
    padding: 8px 16px;
    border-radius: 4px;
    cursor: pointer;
    font-size: 0.9rem;
  }

  .button-primary:hover {
    opacity: 0.9;
  }
</style>
