<script lang="ts">
  import Icon from '../Icon.svelte'
  import BrandMark from '../BrandMark.svelte'
  import { themePreference, saveThemePreference, type Theme } from '../../stores/theme'
  import type { CitationStyle } from '../../types/suggestion'
  import { settings } from '../../stores/settings'
  import { providerState } from '../../stores/llm-provider'
  import { OllamaProvider } from '../../services/llm/ollama'
  import type { Model } from '../../types/llm'

  let isOpen = $state(false)
  let activeTab = $state<'appearance' | 'suggestions' | 'provider' | 'telemetry'>('appearance')
  let dialog: HTMLDialogElement | undefined = $state()
  const sections = [
    { id: 'appearance', name: 'Appearance', icon: 'sun' },
    { id: 'suggestions', name: 'Writing', icon: 'note' },
    { id: 'provider', name: 'AI models', icon: 'cpu' },
    { id: 'telemetry', name: 'Privacy', icon: 'lock' },
  ] as const
  const themes = [
    { id: 'light', name: 'Light', detail: 'Warm paper & ink', icon: 'sun' },
    { id: 'dark', name: 'Dark', detail: 'A quiet evening desk', icon: 'moon' },
    { id: 'auto', name: 'System', detail: 'Follow your device', icon: 'monitor' },
  ] as const
  const headings = { appearance: ['Appearance', 'Choose a comfortable setting for your research.'], suggestions: ['Writing assistance', 'Suggestions stay alongside your work. You choose what to accept.'], provider: ['AI models', 'Choose your preferred provider and model.'], telemetry: ['Privacy & local data', 'Your workspace and research files stay on this machine.'] }

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
    if (activeTab === 'provider' && $settings.suggestions.llmProvider === 'ollama') {
      fetchOllamaModels()
    }
  }

  $effect(() => {
    if (isOpen && dialog && !dialog.open) dialog.showModal()
  })

  export function close() {
    dialog?.close()
    isOpen = false
  }

  function showSection(section: typeof activeTab) {
    activeTab = section
    if (section === 'provider' && $settings.suggestions.llmProvider === 'ollama' && !ollamaModels.length && !loadingModels) void fetchOllamaModels()
  }

  function handleBackdrop(event: PointerEvent) {
    if (!dialog || event.target !== dialog) return
    const rect = dialog.getBoundingClientRect()
    if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) close()
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
  <dialog bind:this={dialog} class="settings-dialog" aria-labelledby="preferences-title" oncancel={(event) => { event.preventDefault(); close() }} onpointerdown={handleBackdrop}>
    <header class="settings-header">
      <div class="settings-brand"><BrandMark size={30} /><h1 id="preferences-title">Settings</h1></div>
      <button class="close-button" onclick={close} aria-label="Close settings"><Icon name="close" /></button>
    </header>
    <nav class="settings-tabs" aria-label="Settings sections">
      <div class="section-links">
        {#each sections as section}
          <button class="tab-button" class:active={activeTab === section.id} aria-current={activeTab === section.id ? 'page' : undefined} onclick={() => showSection(section.id)}><Icon name={section.icon} size={18} /><span>{section.name}</span></button>
        {/each}
      </div>
      <p class="workspace-note"><Icon name="folder" size={16} /> Local workspace</p>
    </nav>
    <div class="settings-content" id="settings-panel">
      <div class="section-intro"><h2>{headings[activeTab][0]}</h2><p>{headings[activeTab][1]}</p></div>
      {#if activeTab === 'appearance'}
        <fieldset class="appearance-options"><legend>Color theme</legend>
          {#each themes as theme}
            <button class="appearance-option" class:active={$themePreference === theme.id} aria-pressed={$themePreference === theme.id} onclick={() => saveThemePreference(theme.id as Theme)}><span class="theme-preview" class:night={theme.id === 'dark'} class:system={theme.id === 'auto'}><Icon name={theme.icon} size={24} /></span><strong>{theme.name}</strong><small>{theme.detail}</small></button>
          {/each}
        </fieldset>
        <div class="setting-note"><Icon name="think" /><p>A little space, fewer distractions. Your theme follows you across the canvas and focused editors.</p></div>
      {:else if activeTab === 'suggestions'}
        <div class="preference-group">
          <label class="toggle-row"><span><strong>Writing suggestions</strong><small>Offer paper references, questions, and possible continuations.</small></span><input type="checkbox" role="switch" checked={$settings.suggestions.enabled} onchange={event => $settings.suggestions.enabled = event.currentTarget.checked} /></label>
          <div class="writing-preferences">
            <label class="field"><span>Citation style</span><select value={$settings.suggestions.citationStyle} onchange={event => $settings.suggestions.citationStyle = event.currentTarget.value as CitationStyle}><option value="author-year">Author & year</option><option value="cite-title">Paper title</option><option value="footnote">Footnote</option></select></label>
            <label class="field"><span>Suggestion layout</span><select value={$settings.suggestions.sidebarLayout} onchange={event => $settings.suggestions.sidebarLayout = event.currentTarget.value as 'sectioned' | 'unified'}><option value="sectioned">Grouped by type</option><option value="unified">One continuous feed</option></select></label>
          </div>
          <p class="supporting-copy">Nothing enters your document without an explicit action from you.</p>
        </div>
      {:else if activeTab === 'provider'}
          <div class="provider-group">
            <h3>Primary Provider</h3>

            <div class="provider-buttons">
              <button
                class="provider-button"
                class:active={$settings.suggestions.llmProvider === 'ollama'}
                aria-pressed={$settings.suggestions.llmProvider === 'ollama'}
                onclick={() => {
                  $settings.suggestions.llmProvider = 'ollama'
                  fetchOllamaModels()
                }}
              >
                <span class="provider-name"><Icon name="cpu" /> Ollama</span>
                <span class="provider-note">Runs on your machine</span>
              </button>

              <button
                class="provider-button"
                class:active={$settings.suggestions.llmProvider === 'llamacpp'}
                aria-pressed={$settings.suggestions.llmProvider === 'llamacpp'}
                onclick={() => {
                  $settings.suggestions.llmProvider = 'llamacpp'
                }}
              >
                <span class="provider-name"><Icon name="cpu" /> llama.cpp</span>
                <span class="provider-note">GGUF & .bin models</span>
              </button>

              <button
                class="provider-button"
                class:active={$settings.suggestions.llmProvider === 'openrouter'}
                aria-pressed={$settings.suggestions.llmProvider === 'openrouter'}
                onclick={() => {
                  $settings.suggestions.llmProvider = 'openrouter'
                }}
              >
                <span class="provider-name"><Icon name="cloud" /> OpenRouter</span>
                <span class="provider-note">Cloud models · API key</span>
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
                <p class="api-key-note">Manage your API key in the conversation or companion provider controls.</p>
              </div>
            {/if}
          </div>

      {:else if activeTab === 'telemetry'}
        <div class="telemetry-group">
          <label class="toggle-row"><span><strong>Local usage insights</strong><small>Keep a local record of which writing suggestions you accept.</small></span><input type="checkbox" role="switch" checked={$settings.suggestions.telemetryOptIn} onchange={event => $settings.suggestions.telemetryOptIn = event.currentTarget.checked} /></label>
          <div class="setting-note"><Icon name="lock" /><p>Off by default. Usage insights are stored locally and are never transmitted.</p></div>
        </div>
      {/if}
    </div>
    <footer class="settings-footer"><small>Changes save automatically.</small><button class="button-primary" onclick={close}>Done</button></footer>
  </dialog>
{/if}

<style>
  .settings-dialog { width: min(860px, calc(100vw - 48px)); height: min(680px, calc(100dvh - 64px)); max-width: none; max-height: none; margin: auto; padding: 0; border: 1px solid var(--color-border-strong); border-radius: 12px; color: var(--color-text); background: var(--color-surface); box-shadow: 0 24px 80px var(--color-shadow); overflow: hidden; }
  .settings-dialog[open] { display: grid; grid-template-columns: 184px minmax(0, 1fr); grid-template-rows: auto minmax(0, 1fr) auto; grid-template-areas: 'header header' 'navigation content' 'navigation footer'; }
  .settings-dialog::backdrop { background: var(--color-overlay); }
  .settings-header { grid-area: header; display: flex; align-items: center; justify-content: space-between; gap: var(--space-md); padding: var(--space-md) var(--space-lg); border-bottom: 1px solid var(--color-border); }
  .settings-brand { display: flex; align-items: center; gap: var(--space-sm); } h1 { font: 400 24px/1.2 var(--font-display); margin: 0; }
  button { color: var(--color-text-secondary); background: transparent; border: 1px solid var(--color-border); border-radius: var(--radius-input); padding: 10px 14px; font: inherit; font-size: var(--text-sm); cursor: pointer; }
  button:hover:not(:disabled) { color: var(--color-text); background: var(--color-surface-2); }
  .close-button { display: inline-flex; align-items: center; justify-content: center; padding: var(--space-sm); border: 0; }
  .settings-tabs { grid-area: navigation; display: flex; flex-direction: column; justify-content: space-between; padding: var(--space-lg) 12px; background: var(--color-bg); border-right: 1px solid var(--color-border); }
  .section-links { display: flex; flex-direction: column; gap: var(--space-sm); }
  .tab-button { display: flex; align-items: center; gap: 12px; text-align: left; padding: 12px; border-color: transparent; }
  .tab-button.active { background: var(--color-accent-subtle); color: var(--color-accent); }
  .workspace-note { display: flex; align-items: center; gap: var(--space-sm); padding: 0 12px; color: var(--color-text-muted); font-size: var(--text-xs); }
  .settings-content { grid-area: content; min-height: 0; overflow-y: auto; padding: var(--space-xl); scrollbar-gutter: stable; }
  .section-intro { margin-bottom: var(--space-xl); } h2 { font: 400 30px/1.2 var(--font-display); margin: 0 0 12px; }
  p { margin: 0; font-size: var(--text-sm); line-height: 1.7; color: var(--color-text-secondary); }
  .settings-footer { grid-area: footer; display: flex; align-items: center; justify-content: space-between; gap: var(--space-md); padding: var(--space-md) var(--space-xl); border-top: 1px solid var(--color-border); }
  .settings-footer small { font-size: var(--text-xs); color: var(--color-text-muted); }
  .button-primary { background: var(--color-accent); border-color: var(--color-accent); color: var(--color-on-accent); min-width: 80px; }
  .button-primary:hover:not(:disabled) { background: var(--color-accent-hover); color: var(--color-on-accent); }
  fieldset { min-width: 0; margin: 0; padding: 0; border: 0; } legend, h3, h4 { font-size: var(--text-sm); font-weight: 600; margin: 0 0 12px; }
  .appearance-options { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 12px; }
  .appearance-option { display: flex; flex-direction: column; align-items: flex-start; gap: var(--space-sm); padding: 12px; min-width: 0; }
  .appearance-option.active { border-color: var(--color-accent); background: var(--color-accent-subtle); }
  .theme-preview { width: 100%; height: 76px; display: flex; align-items: center; justify-content: center; border: 1px solid var(--color-border); border-radius: var(--radius-input); color: var(--color-brand-ink); background: var(--color-brand-paper); }
  .theme-preview.night { background: var(--color-brand-ink); color: var(--color-brand-paper); } .theme-preview.system { background: var(--color-surface-2); color: var(--color-text); }
  .appearance-option strong { font-size: var(--text-sm); font-weight: 500; } .appearance-option small { font-size: var(--text-xs); text-align: left; color: var(--color-text-muted); }
  .setting-note { display: flex; align-items: flex-start; gap: 12px; padding-top: var(--space-lg); margin-top: var(--space-lg); border-top: 1px solid var(--color-border); color: var(--color-accent); }
  .setting-note p { font-size: var(--text-xs); }
  .toggle-row { display: flex; align-items: center; justify-content: space-between; gap: var(--space-lg); padding-bottom: var(--space-lg); border-bottom: 1px solid var(--color-border); cursor: pointer; }
  .toggle-row strong { display: block; font-size: var(--text-md); font-weight: 500; } .toggle-row small { display: block; margin-top: var(--space-sm); color: var(--color-text-secondary); font-size: var(--text-sm); line-height: 1.7; }
  input[type='checkbox'] { appearance: none; position: relative; width: 38px; height: 24px; margin: 0; flex-shrink: 0; background: var(--color-border-strong); border: 1px solid var(--color-border-strong); border-radius: 16px; cursor: pointer; }
  input[type='checkbox']::before { content: ''; position: absolute; width: 16px; height: 16px; top: 3px; left: 3px; background: var(--color-surface); border-radius: 50%; transition: transform var(--dur-short) var(--ease-out); }
  input[type='checkbox']:checked { background: var(--color-accent); border-color: var(--color-accent); } input[type='checkbox']:checked::before { transform: translateX(14px); background: var(--color-on-accent); }
  .writing-preferences { display: grid; grid-template-columns: 1fr 1fr; gap: var(--space-lg); padding: var(--space-lg) 0; }
  .field { display: flex; flex-direction: column; gap: var(--space-sm); font-size: var(--text-sm); }
  input:not([type='checkbox']), select { width: 100%; min-width: 0; padding: 10px 12px; border: 1px solid var(--color-border-strong); border-radius: var(--radius-input); background: var(--color-bg); color: var(--color-text); font: inherit; font-size: var(--text-sm); }
  .supporting-copy { font-size: var(--text-xs); color: var(--color-text-muted); }
  .provider-buttons { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: var(--space-sm); margin: var(--space-lg) 0 var(--space-xl); }
  .provider-button { display: flex; flex-direction: column; align-items: flex-start; gap: var(--space-sm); padding: 12px; }
  .provider-button.active { border-color: var(--color-accent); background: var(--color-accent-subtle); }
  .provider-name { display: flex; align-items: center; gap: var(--space-sm); color: var(--color-text); white-space: nowrap; }
  .provider-note { font-size: var(--text-xs); color: var(--color-text-muted); line-height: 1.5; }
  .ollama-section, .llamacpp-section, .openrouter-section { display: flex; flex-direction: column; gap: var(--space-md); padding-top: var(--space-lg); border-top: 1px solid var(--color-border); }
  .ollama-section, .llamacpp-section { display: grid; grid-template-columns: minmax(0, 1fr) 112px; }
  .ollama-section > :not(.config-row), .llamacpp-section > :not(.config-row) { grid-column: 1 / -1; }
  .config-row label { display: flex; flex-direction: column; align-items: stretch; gap: var(--space-sm); font-size: var(--text-sm); }
  .model-select label, .model-id-input label { display: grid; grid-template-columns: 120px minmax(0, 1fr); align-items: center; gap: var(--space-md); font-size: var(--text-sm); }
  .model-select, .model-id-input { display: flex; flex-direction: column; gap: var(--space-sm); } .model-select label, .model-id-input label { width: 100%; }
  .refresh-button, .detect-button { align-self: flex-start; } .button-group { display: flex; flex-wrap: wrap; align-items: center; gap: var(--space-sm); }
  .model-path, .binary-path { overflow-wrap: anywhere; font-size: var(--text-xs); }
  .model-info-card { padding: var(--space-md); background: var(--color-bg); border: 1px solid var(--color-border); border-radius: var(--radius-input); }
  .info-row { display: flex; justify-content: space-between; gap: var(--space-md); font-size: var(--text-xs); padding: var(--space-xs) 0; }
  .info-label { color: var(--color-text-secondary); }
  .error-message, .invalid-icon { color: var(--color-error); font-size: var(--text-xs); } .success-message, .valid-icon { color: var(--color-success); font-size: var(--text-xs); }
  .validating, .api-key-note, .openrouter-note, .llamacpp-note { font-size: var(--text-xs); color: var(--color-text-muted); }
  a { color: var(--color-accent); text-underline-offset: 3px; }
  @media (max-width: 680px) {
    .settings-dialog { width: calc(100vw - 24px); height: calc(100dvh - 32px); }
    .settings-dialog[open] { grid-template-columns: minmax(0, 1fr); grid-template-rows: auto auto minmax(0, 1fr) auto; grid-template-areas: 'header' 'navigation' 'content' 'footer'; }
    .settings-tabs { padding: var(--space-sm) 12px; border-right: 0; border-bottom: 1px solid var(--color-border); } .section-links { flex-direction: row; gap: var(--space-xs); } .tab-button { flex: 1; justify-content: center; gap: var(--space-sm); padding: 10px 6px; font-size: var(--text-xs); } .workspace-note { display: none; }
    .settings-content { padding: var(--space-lg); } .settings-footer { padding: var(--space-md) var(--space-lg); }
    .writing-preferences { grid-template-columns: 1fr; }
  }
  .tab-button.active:hover, .appearance-option.active:hover, .provider-button.active:hover { color: var(--color-accent); background: var(--color-accent-subtle); }
  @media (max-width: 420px) { .ollama-section, .llamacpp-section { grid-template-columns: 1fr; } .provider-buttons { grid-template-columns: 1fr; } .tab-button { flex-direction: column; } .config-row label, .model-select label, .model-id-input label { grid-template-columns: 1fr; gap: var(--space-sm); } }
</style>
