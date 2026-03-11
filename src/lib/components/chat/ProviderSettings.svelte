<!-- ProviderSettings.svelte — LLM provider toggle and API key management -->
<script lang="ts">
  import { providerState, switchProvider, setApiKey } from '../../stores/llm-provider'

  let showSettings = $state(false)
  let apiKeyInput = $state('')
  let selectedProvider = $state<'ollama' | 'openrouter'>('ollama')
  let isSwitching = $state(false)

  $effect(() => {
    selectedProvider = $providerState.type
    apiKeyInput = $providerState.apiKey || ''
  })

  async function handleProviderChange() {
    if (selectedProvider === 'openrouter' && !apiKeyInput.trim()) return
    isSwitching = true
    try {
      await switchProvider(selectedProvider, apiKeyInput.trim() || undefined)
    } finally {
      isSwitching = false
    }
  }

  async function handleSaveKey() {
    if (!apiKeyInput.trim()) return
    await setApiKey('openrouter', apiKeyInput.trim())
    if (selectedProvider === 'openrouter') await handleProviderChange()
  }
</script>

<div class="provider-settings">
  <button class="toggle" onclick={() => (showSettings = !showSettings)}>
    <span class="provider-label">
      {$providerState.type === 'ollama' ? '🦙 Ollama (Local)' : '🌐 OpenRouter (Cloud)'}
    </span>
    <span class="status-dot" class:available={!!$providerState.provider}></span>
    <span class="toggle-icon">{showSettings ? '▼' : '▶'}</span>
  </button>

  {#if showSettings}
    <div class="settings-panel">
      <div class="radio-group">
        <label class="radio-label">
          <input
            type="radio"
            value="ollama"
            bind:group={selectedProvider}
            onchange={handleProviderChange}
            disabled={isSwitching}
          />
          <span>🦙 Ollama (Local)</span>
          <span class="sub-label">Run models on your machine</span>
        </label>
        <label class="radio-label">
          <input
            type="radio"
            value="openrouter"
            bind:group={selectedProvider}
            onchange={handleProviderChange}
            disabled={isSwitching}
          />
          <span>🌐 OpenRouter (Cloud)</span>
          <span class="sub-label">100+ models — GPT, Claude, Gemini…</span>
        </label>
      </div>

      {#if selectedProvider === 'openrouter'}
        <div class="api-key-section">
          <label class="key-label" for="api-key-input">API Key</label>
          <input
            id="api-key-input"
            type="password"
            bind:value={apiKeyInput}
            placeholder="sk-or-..."
            onblur={handleSaveKey}
          />
          <p class="hint">🔒 Stored securely in OS keychain · <a href="https://openrouter.ai/keys" target="_blank">Get a key</a></p>
        </div>
      {/if}

      {#if isSwitching}
        <div class="status-message">Switching provider…</div>
      {/if}

      {#if $providerState.error}
        <div class="error-message">{$providerState.error}</div>
      {/if}
    </div>
  {/if}
</div>

<style>
  .provider-settings {
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
    text-align: left;
    transition: background 0.15s;
  }

  .toggle:hover { background: var(--color-border); }

  .provider-label { flex: 1; font-weight: 500; }

  .status-dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: #f87171;
    flex-shrink: 0;
  }

  .status-dot.available { background: #4ade80; }

  .toggle-icon { font-size: 10px; color: var(--color-text-muted); }

  .settings-panel {
    margin-top: 8px;
    padding: 12px;
    background: var(--color-surface);
    border: 1px solid var(--color-border);
    border-radius: 6px;
  }

  .radio-group { display: flex; flex-direction: column; gap: 8px; }

  .radio-label {
    display: flex;
    align-items: center;
    gap: 8px;
    cursor: pointer;
    padding: 6px 8px;
    border-radius: 4px;
    font-size: 13px;
    transition: background 0.1s;
  }

  .radio-label:hover { background: var(--color-bg); }

  .sub-label { font-size: 11px; color: var(--color-text-muted); margin-left: auto; }

  .api-key-section {
    margin-top: 12px;
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .key-label { font-size: 12px; color: var(--color-text-secondary); font-weight: 500; }

  .api-key-section input {
    padding: 8px 10px;
    background: var(--color-bg);
    border: 1px solid var(--color-border);
    border-radius: 4px;
    color: var(--color-text);
    font-family: monospace;
    font-size: 13px;
    width: 100%;
  }

  .api-key-section input:focus { outline: none; border-color: var(--color-accent); }

  .hint { font-size: 11px; color: var(--color-text-muted); margin: 0; }
  .hint a { color: var(--color-accent); }

  .status-message { margin-top: 8px; font-size: 12px; color: var(--color-text-secondary); }

  .error-message {
    margin-top: 8px;
    padding: 8px;
    background: rgba(255, 107, 107, 0.15);
    border: 1px solid var(--color-error);
    border-radius: 4px;
    font-size: 12px;
    color: var(--color-error);
  }
</style>
