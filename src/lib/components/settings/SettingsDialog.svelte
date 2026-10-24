<script lang="ts">
  import Icon from '../Icon.svelte'
  import { settings } from '../../stores/settings'
  import { providerState } from '../../stores/llm-provider'
  import { OllamaProvider } from '../../services/llm/ollama'
  import type { Model } from '../../types/llm'

  let isOpen = $state(false)
  let activeTab = $state<'suggestions' | 'provider' | 'telemetry'>('suggestions')

  // Ollama model selection state
  let ollamaModels = $state<Model[]>([])
  let loadingModels = $state(false)
  let ollamaConnectionError = $state<string | null>(null)
  let ollamaHostError = $state<string | null>(null)
  let ollamaPortError = $state<string | null>(null)

  // OpenRouter model validation state
  let openrouterValidating = $state(false)
  let openrouterValidationError = $state<string | null>(null)
  let openrouterValidationSuccess = $state(false)

  // llama.cpp state
  let llamaCppConnectionError = $state<string | null>(null)
  let llamaCppDetecting = $state(false)
  let llamaCppModelInfo = $state<any>(null)

  export function open() {
    isOpen = true
    // Fetch models when dialog opens
    if ($settings.suggestions.llmProvider === 'ollama') {
      fetchOllamaModels()
    }
  }

  // React to provider changes within the dialog
  $effect(() => {
    if (isOpen && $settings.suggestions.llmProvider === 'ollama' && ollamaModels.length === 0 && !loadingModels) {
      fetchOllamaModels()
    }
  })

  export function close() {
    isOpen = false
  }

  async function fetchOllamaModels() {
    loadingModels = true
    ollamaConnectionError = null
    try {
      const provider = new OllamaProvider($settings.suggestions.ollamaHost, $settings.suggestions.ollamaPort)
      const models = await provider.models()
      ollamaModels = models

      // Auto-select first model if ollamaModel is null
      if (!$settings.suggestions.ollamaModel && models.length > 0) {
        $settings.suggestions.ollamaModel = models[0].id
      }
    } catch (err) {
      ollamaConnectionError = 'Ollama not reachable — start it to load models'
      ollamaModels = []
    } finally {
      loadingModels = false
    }
  }

  async function validateOllamaConnection() {
    ollamaHostError = null
    ollamaPortError = null
    try {
      const provider = new OllamaProvider($settings.suggestions.ollamaHost, $settings.suggestions.ollamaPort)
      const available = await provider.isAvailable()
      if (!available) {
        ollamaConnectionError = 'Ollama not running at this address'
      } else {
        ollamaConnectionError = null
      }
    } catch (err) {
      ollamaConnectionError = 'Connection failed'
    }
  }

  async function validateOpenRouterModel() {
    openrouterValidationError = null
    openrouterValidationSuccess = false
    if (!$settings.suggestions.openrouterModel.trim()) {
      return
    }

    openrouterValidating = true
    try {
      const { OpenRouterProvider } = await import('../../services/llm/openrouter')
      // Get API key from providerState (passed via props or store)
      const apiKey = $providerState.apiKey || ''
      if (!apiKey) {
        openrouterValidationError = 'API key not found. Set it in chat settings.'
        return
      }

      const provider = new OpenRouterProvider(apiKey)
      const result = await provider.validateModel($settings.suggestions.openrouterModel)
      if (result.valid) {
        openrouterValidationSuccess = true
      } else {
        openrouterValidationError = result.error || 'Validation failed'
      }
    } catch (err) {
      openrouterValidationError = 'Validation error'
    } finally {
      openrouterValidating = false
    }
  }

  async function detectLlamaCpp() {
    llamaCppDetecting = true
    llamaCppConnectionError = null
    try {
      const { detectLlamaCppBinary } = await import('../../services/system/llamacpp-launcher')
      const binaryPath = await detectLlamaCppBinary()
      if (binaryPath) {
        $settings.suggestions.llamaCppBinaryPath = binaryPath
      } else {
        llamaCppConnectionError = 'Binary not found in common paths. Please specify manually.'
      }
    } catch (err) {
      llamaCppConnectionError = 'Detection failed'
    } finally {
      llamaCppDetecting = false
    }
  }

  async function validateLlamaCppConnection() {
    llamaCppConnectionError = null
    try {
      const { LlamaCppProvider } = await import('../../services/llm/llamacpp')
      const provider = new LlamaCppProvider({
        host: $settings.suggestions.llamaCppHost,
        port: $settings.suggestions.llamaCppPort,
        modelPath: $settings.suggestions.llamaCppModel ?? undefined
      })
      const available = await provider.isAvailable()
      if (available) {
        llamaCppModelInfo = provider.getModelInfo()
      } else {
        llamaCppConnectionError = 'Server not running or model not loaded'
      }
    } catch (err) {
      llamaCppConnectionError = 'Connection failed'
    }
  }

  async function pickModelFile() {
    try {
      // Use native file dialog via Tauri
      const { open } = await import('@tauri-apps/plugin-dialog')
      const selected = await open({
        multiple: false,
        filters: [
          { name: 'Model Files', extensions: ['gguf', 'bin'] },
          { name: 'All Files', extensions: ['*'] }
        ]
      })
      if (selected && typeof selected === 'string') {
        $settings.suggestions.llamaCppModel = selected
        validateLlamaCppConnection()
      }
    } catch (err) {
      llamaCppConnectionError = 'File picker failed'
    }
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

            {#if $settings.suggestions.enabled}
              <div class="display-mode-group">
                <h4>Display Mode</h4>
                <div class="mode-options">
                  <label>
                    <input
                      type="radio"
                      name="displayMode"
                      value="ghost"
                      checked={$settings.suggestions.displayMode === 'ghost'}
                      onchange={() => {
                        $settings.suggestions.displayMode = 'ghost'
                      }}
                    />
                    <span>Ghost Text</span>
                    <span class="mode-desc">Faint text that disappears as you type</span>
                  </label>

                  <label>
                    <input
                      type="radio"
                      name="displayMode"
                      value="block"
                      checked={$settings.suggestions.displayMode === 'block'}
                      onchange={() => {
                        $settings.suggestions.displayMode = 'block'
                      }}
                    />
                    <span>Block Highlight</span>
                    <span class="mode-desc">Highlighted block below your text</span>
                  </label>

                  <label>
                    <input
                      type="radio"
                      name="displayMode"
                      value="both"
                      checked={$settings.suggestions.displayMode === 'both'}
                      onchange={() => {
                        $settings.suggestions.displayMode = 'both'
                      }}
                    />
                    <span>Both</span>
                    <span class="mode-desc">Ghost text + block highlight</span>
                  </label>
                </div>
              </div>
            {/if}
          </div>
        {:else if activeTab === 'provider'}
          <div class="provider-group">
            <h3>Primary Provider</h3>
            <p class="provider-description">Select which LLM provider to use for suggestions. If the primary provider fails, suggestions will automatically fall back to the other provider.</p>

            <div class="provider-buttons">
              <button
                class="provider-button"
                class:active={$settings.suggestions.llmProvider === 'ollama'}
                onclick={() => {
                  $settings.suggestions.llmProvider = 'ollama'
                }}
              >
                <span class="provider-name"><Icon name="cpu" /> Ollama</span>
                <span class="provider-note">Local LLM (fast, private)</span>
              </button>

              <button
                class="provider-button"
                class:active={$settings.suggestions.llmProvider === 'llamacpp'}
                onclick={() => {
                  $settings.suggestions.llmProvider = 'llamacpp'
                }}
              >
                <span class="provider-name"><Icon name="cpu" /> llama.cpp</span>
                <span class="provider-note">Local GGUF (high performance)</span>
              </button>

              <button
                class="provider-button"
                class:active={$settings.suggestions.llmProvider === 'openrouter'}
                onclick={() => {
                  $settings.suggestions.llmProvider = 'openrouter'
                }}
              >
                <span class="provider-name"><Icon name="graph" /> OpenRouter</span>
                <span class="provider-note">Cloud LLM (requires API key)</span>
              </button>
            </div>

            {#if $settings.suggestions.llmProvider === 'ollama'}
              <div class="ollama-section">
                <h4>Ollama Configuration</h4>

                <div class="config-row">
                  <label>
                    <span>Host:</span>
                    <input
                      type="text"
                      value={$settings.suggestions.ollamaHost}
                      onchange={(e) => {
                        $settings.suggestions.ollamaHost = e.currentTarget.value
                        validateOllamaConnection()
                      }}
                      placeholder="localhost"
                    />
                  </label>
                </div>

                <div class="config-row">
                  <label>
                    <span>Port:</span>
                    <input
                      type="number"
                      value={$settings.suggestions.ollamaPort}
                      onchange={(e) => {
                        $settings.suggestions.ollamaPort = parseInt(e.currentTarget.value) || 11434
                        validateOllamaConnection()
                      }}
                      placeholder="11434"
                    />
                  </label>
                </div>

                {#if ollamaConnectionError}
                  <p class="error-message">{ollamaConnectionError}</p>
                {:else if ollamaModels.length > 0}
                  <p class="success-message">✓ Connected</p>
                {/if}

                <div class="model-select">
                  <label>
                    <span>Model:</span>
                    {#if loadingModels}
                      <select disabled>
                        <option>Loading models...</option>
                      </select>
                    {:else if ollamaModels.length > 0}
                      <select
                        value={$settings.suggestions.ollamaModel || ''}
                        onchange={(e) => {
                          $settings.suggestions.ollamaModel = e.currentTarget.value
                        }}
                      >
                        {#each ollamaModels as model}
                          <option value={model.id}>{model.name}</option>
                        {/each}
                      </select>
                    {:else}
                      <select disabled>
                        <option>No models (start Ollama)</option>
                      </select>
                    {/if}
                  </label>
                </div>

                <button
                  class="refresh-button"
                  onclick={() => fetchOllamaModels()}
                  disabled={loadingModels}
                >
                  {loadingModels ? '⟳ Refreshing...' : '⟳ Refresh Models'}
                </button>
              </div>
            {/if}

            {#if $settings.suggestions.llmProvider === 'llamacpp'}
              <div class="llamacpp-section">
                <h4>llama.cpp Configuration</h4>

                <div class="config-row">
                  <label>
                    <span>Host:</span>
                    <input
                      type="text"
                      value={$settings.suggestions.llamaCppHost}
                      onchange={(e) => {
                        $settings.suggestions.llamaCppHost = e.currentTarget.value
                        validateLlamaCppConnection()
                      }}
                      placeholder="localhost"
                    />
                  </label>
                </div>

                <div class="config-row">
                  <label>
                    <span>Port:</span>
                    <input
                      type="number"
                      value={$settings.suggestions.llamaCppPort}
                      onchange={(e) => {
                        $settings.suggestions.llamaCppPort = parseInt(e.currentTarget.value) || 8000
                        validateLlamaCppConnection()
                      }}
                      placeholder="8000"
                    />
                  </label>
                </div>

                <div class="model-select">
                  <label>
                    <span>Model File (.gguf, .bin):</span>
                    <button class="file-picker-button" onclick={pickModelFile}>
                      <Icon name="folder" /> {$settings.suggestions.llamaCppModel ? 'Change Model' : 'Select Model'}
                    </button>
                  </label>
                  {#if $settings.suggestions.llamaCppModel}
                    <p class="model-path">{$settings.suggestions.llamaCppModel.split('/').pop()}</p>
                  {/if}
                </div>

                {#if llamaCppModelInfo}
                  <div class="model-info-card">
                    <div class="info-row">
                      <span class="info-label">Quantization:</span>
                      <span>{llamaCppModelInfo.quantization || 'Unknown'}</span>
                    </div>
                    <div class="info-row">
                      <span class="info-label">Parameters:</span>
                      <span>{llamaCppModelInfo.parameterCount || 'Unknown'}</span>
                    </div>
                    <div class="info-row">
                      <span class="info-label">File Size:</span>
                      <span>{llamaCppModelInfo.fileSizeFormatted}</span>
                    </div>
                  </div>
                {/if}

                {#if llamaCppConnectionError}
                  <p class="error-message">{llamaCppConnectionError}</p>
                {:else if llamaCppModelInfo}
                  <p class="success-message">✓ Server connected</p>
                {/if}

                <div class="button-group">
                  <button
                    class="detect-button"
                    onclick={detectLlamaCpp}
                    disabled={llamaCppDetecting}
                  >
                    <Icon name="search" /> {llamaCppDetecting ? 'Detecting...' : 'Detect Binary'}
                  </button>
                  {#if $settings.suggestions.llamaCppBinaryPath}
                    <p class="binary-path">Binary: {$settings.suggestions.llamaCppBinaryPath.split('/').pop()}</p>
                  {/if}
                </div>

                <p class="llamacpp-note">
                  llama.cpp runs one model at a time. <a href="https://github.com/ggerganov/llama.cpp" target="_blank">Download and build llama.cpp</a>, then select a .gguf or .bin model file.
                </p>
              </div>
            {/if}

            {#if $settings.suggestions.llmProvider === 'openrouter'}
              <div class="openrouter-section">
                <h4>OpenRouter Configuration</h4>

                <div class="model-id-input">
                  <label>
                    <span>Model ID:</span>
                    <input
                      type="text"
                      value={$settings.suggestions.openrouterModel}
                      onchange={(e) => {
                        $settings.suggestions.openrouterModel = e.currentTarget.value
                        validateOpenRouterModel()
                      }}
                      placeholder="openai/gpt-4o-mini"
                    />
                  </label>
                  {#if openrouterValidating}
                    <span class="validating">⟳ Validating...</span>
                  {:else if openrouterValidationSuccess}
                    <span class="valid-icon">✓</span>
                  {:else if openrouterValidationError}
                    <span class="invalid-icon">✗</span>
                  {/if}
                </div>

                {#if openrouterValidationError}
                  <p class="error-message">{openrouterValidationError}</p>
                {/if}

                <p class="openrouter-note">Paste a model ID from <a href="https://openrouter.ai/models" target="_blank">openrouter.ai/models</a></p>
                <p class="api-key-note">Your API key is stored securely in your workspace</p>
              </div>
            {/if}
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
    background: rgba(0, 0, 0, 0.7);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
  }

  .settings-dialog {
    background: var(--color-surface-0);
    border: 1px solid var(--color-surface-2);
    border-radius: 12px;
    width: 92%;
    max-width: 520px;
    min-height: 55vh;
    max-height: 88vh;
    overflow: hidden;
    display: flex;
    flex-direction: column;
    box-shadow: 0 20px 60px rgba(0, 0, 0, 0.6);
  }

  .settings-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 20px 24px;
    border-bottom: 1px solid var(--color-surface-2);
    flex-shrink: 0;
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
    flex-shrink: 0;
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
    padding: 16px 24px;
    border-top: 1px solid var(--color-surface-2);
    flex-shrink: 0;
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

  .provider-description {
    color: var(--color-text-secondary);
    font-size: 0.85rem;
    line-height: 1.4;
  }

  .provider-buttons {
    display: flex;
    flex-direction: column;
    gap: 8px;
    margin: 16px 0;
  }

  .provider-button {
    display: flex;
    flex-direction: column;
    gap: 4px;
    padding: 12px;
    background: var(--color-surface-2);
    border: 2px solid transparent;
    border-radius: 6px;
    cursor: pointer;
    transition: all 0.2s;
    text-align: left;
  }

  .provider-button:hover {
    background: var(--color-surface-3);
    border-color: var(--color-accent);
  }

  .provider-button.active {
    background: var(--color-surface-3);
    border-color: var(--color-accent);
    box-shadow: 0 0 0 1px var(--color-accent);
  }

  .provider-name {
    font-weight: 600;
    color: var(--color-text);
    font-size: 0.95rem;
  }

  .provider-note {
    font-size: 0.8rem;
    color: var(--color-text-secondary);
  }

  .api-key-section {
    margin-top: 16px;
    padding: 12px;
    background: var(--color-surface-2);
    border-radius: 4px;
  }

  .api-key-section h4 {
    margin: 0 0 8px 0;
    font-size: 0.9rem;
  }

  .api-key-note {
    font-size: 0.8rem;
    color: var(--color-text-secondary);
    margin: 0;
  }

  .display-mode-group {
    margin-top: 16px;
    padding: 12px;
    background: var(--color-surface-2);
    border-radius: 4px;
  }

  .display-mode-group h4 {
    margin: 0 0 12px 0;
    font-size: 0.9rem;
    font-weight: 600;
  }

  .mode-options {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .mode-options label {
    display: flex;
    flex-direction: column;
    gap: 4px;
    padding: 8px;
    background: var(--color-surface-2);
    border-radius: 3px;
    cursor: pointer;
  }

  .mode-options input[type="radio"] {
    cursor: pointer;
  }

  .mode-options span:first-child {
    font-weight: 500;
    color: var(--color-text);
    font-size: 0.9rem;
  }

  .mode-desc {
    font-size: 0.8rem;
    color: var(--color-text-secondary);
    margin-left: 0;
  }

  .ollama-section {
    margin-top: 16px;
    padding: 12px;
    background: var(--color-surface-2);
    border-radius: 4px;
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  .ollama-section h4 {
    margin: 0;
    font-size: 0.9rem;
    font-weight: 600;
  }

  .config-row {
    display: flex;
    gap: 8px;
  }

  .config-row label {
    display: flex;
    gap: 8px;
    align-items: center;
    flex: 1;
  }

  .config-row label span {
    min-width: 60px;
    font-size: 0.85rem;
  }

  .config-row input[type="text"],
  .config-row input[type="number"] {
    flex: 1;
    padding: 6px 8px;
    background: var(--color-surface-2);
    border: 1px solid var(--color-surface-3);
    border-radius: 3px;
    color: var(--color-text);
    font-size: 0.85rem;
  }

  .model-select {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .model-select label {
    display: flex;
    gap: 8px;
    align-items: center;
    flex: 1;
  }

  .model-select label span {
    min-width: 60px;
    font-size: 0.85rem;
  }

  .model-select select {
    flex: 1;
    padding: 6px 8px;
    background: var(--color-surface-2);
    border: 1px solid var(--color-surface-3);
    border-radius: 3px;
    color: var(--color-text);
    font-size: 0.85rem;
  }

  .model-select select:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .refresh-button {
    padding: 6px 12px;
    background: var(--color-surface-3);
    border: 1px solid var(--color-surface-2);
    border-radius: 3px;
    color: var(--color-text);
    font-size: 0.85rem;
    cursor: pointer;
    transition: all 0.2s;
  }

  .refresh-button:hover:not(:disabled) {
    background: var(--color-accent);
    color: white;
  }

  .refresh-button:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .error-message {
    color: var(--color-error, #ef4444);
    font-size: 0.8rem;
    margin: 0;
  }

  .success-message {
    color: var(--color-success, #22c55e);
    font-size: 0.8rem;
    margin: 0;
  }

  .openrouter-section {
    margin-top: 16px;
    padding: 12px;
    background: var(--color-surface-2);
    border-radius: 4px;
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  .openrouter-section h4 {
    margin: 0;
    font-size: 0.9rem;
    font-weight: 600;
  }

  .model-id-input {
    display: flex;
    gap: 8px;
    align-items: center;
  }

  .model-id-input label {
    display: flex;
    gap: 8px;
    align-items: center;
    flex: 1;
  }

  .model-id-input label span {
    min-width: 70px;
    font-size: 0.85rem;
  }

  .model-id-input input {
    flex: 1;
    padding: 6px 8px;
    background: var(--color-surface-2);
    border: 1px solid var(--color-surface-3);
    border-radius: 3px;
    color: var(--color-text);
    font-size: 0.85rem;
  }

  .validating,
  .valid-icon,
  .invalid-icon {
    font-size: 0.85rem;
    min-width: 30px;
    text-align: right;
  }

  .valid-icon {
    color: var(--color-success, #22c55e);
    font-weight: bold;
  }

  .invalid-icon {
    color: var(--color-error, #ef4444);
    font-weight: bold;
  }

  .validating {
    color: var(--color-text-secondary);
  }

  .openrouter-note {
    font-size: 0.8rem;
    color: var(--color-text-secondary);
    margin: 0;
  }

  .openrouter-note a {
    color: var(--color-accent);
    text-decoration: none;
  }

  .openrouter-note a:hover {
    text-decoration: underline;
  }

  .llamacpp-section {
    margin-top: 16px;
    padding: 12px;
    background: var(--color-surface-2);
    border-radius: 4px;
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  .llamacpp-section h4 {
    margin: 0;
    font-size: 0.9rem;
    font-weight: 600;
  }

  .file-picker-button {
    flex: 1;
    padding: 6px 8px;
    background: var(--color-surface-3);
    border: 1px solid var(--color-surface-4, var(--color-surface-2));
    border-radius: 3px;
    color: var(--color-text);
    font-size: 0.85rem;
    cursor: pointer;
    transition: all 0.2s;
  }

  .file-picker-button:hover {
    background: var(--color-accent);
    color: white;
  }

  .model-path {
    font-size: 0.8rem;
    color: var(--color-text-secondary);
    margin: 0;
    word-break: break-all;
  }

  .model-info-card {
    padding: 8px;
    background: var(--color-surface-3);
    border-radius: 3px;
    display: flex;
    flex-direction: column;
    gap: 6px;
  }

  .info-row {
    display: flex;
    justify-content: space-between;
    font-size: 0.85rem;
  }

  .info-label {
    color: var(--color-text-secondary);
    font-weight: 500;
  }

  .button-group {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .detect-button {
    padding: 6px 12px;
    background: var(--color-surface-3);
    border: 1px solid var(--color-surface-2);
    border-radius: 3px;
    color: var(--color-text);
    font-size: 0.85rem;
    cursor: pointer;
    transition: all 0.2s;
  }

  .detect-button:hover:not(:disabled) {
    background: var(--color-accent);
    color: white;
  }

  .detect-button:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .binary-path {
    font-size: 0.8rem;
    color: var(--color-text-secondary);
    margin: 0;
    word-break: break-all;
  }

  .llamacpp-note {
    font-size: 0.8rem;
    color: var(--color-text-secondary);
    margin: 0;
  }

  .llamacpp-note a {
    color: var(--color-accent);
    text-decoration: none;
  }

  .llamacpp-note a:hover {
    text-decoration: underline;
  }
</style>
