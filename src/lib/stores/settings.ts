import { writable, get } from 'svelte/store'
import { invoke } from '@tauri-apps/api/core'
import { workspace } from './workspace'
import type { Settings, SuggestionSettings } from '../types/suggestion'

/**
 * Default settings per 09-CONTEXT.md locked decisions.
 * Area 2: displayMode = ghost, acceptKeybinding = tab
 * Area 6: primaryProvider = ollama, fallbackChain = [ollama, openrouter]
 * Area 8: telemetryOptIn = false (opt-in only)
 * Model config: ollamaModel = null (auto-select), openrouterModel = 'openai/gpt-4o-mini'
 */
const defaultSettings: Settings = {
  suggestions: {
    enabled: true,
    displayMode: 'ghost',
    acceptKeybinding: 'tab',
    llmProvider: 'ollama',
    fallbackChain: ['ollama', 'openrouter'],
    telemetryOptIn: false,
    ollamaModel: null,
    openrouterModel: 'openai/gpt-4o-mini',
    ollamaHost: 'localhost',
    ollamaPort: 11434
  }
}

export const settings = writable<Settings>(defaultSettings)

let pendingSave: ReturnType<typeof setTimeout> | null = null

/**
 * Auto-save settings on changes (debounced 300ms).
 * Same pattern as document save from Phase 8.
 */
settings.subscribe(async (value) => {
  if (pendingSave) clearTimeout(pendingSave)

  pendingSave = setTimeout(async () => {
    const ws = get(workspace)
    if (!ws) return

    try {
      await invoke('save_settings', {
        workspacePath: ws.path,
        settings: JSON.stringify(value, null, 2)
      })
      console.log('[settings] Saved to workspace')
    } catch (err) {
      console.error('[settings] Save failed:', err)
    }
  }, 300)
})

/**
 * Load settings from workspace on startup.
 * Merge with defaults to handle migration (new fields not in old saved settings).
 * Called from App.svelte during workspace initialization.
 */
export async function loadSettings(workspacePath: string): Promise<void> {
  try {
    const content = await invoke<string | null>('load_settings', {
      workspacePath
    })
    if (content) {
      const loaded = JSON.parse(content) as Settings
      // Merge with defaults: fill in any missing fields from defaultSettings
      const merged: Settings = {
        ...defaultSettings,
        ...loaded,
        suggestions: {
          ...defaultSettings.suggestions,
          ...(loaded.suggestions || {})
        }
      }
      settings.set(merged)
      console.log('[settings] Loaded from workspace (merged with defaults)')
    }
  } catch (err) {
    console.error('[settings] Load failed:', err)
    // Keep defaults if load fails
  }
}

/**
 * Update suggestion settings (display, keybinding, provider config).
 * Triggers auto-save via store subscription.
 */
export function updateSuggestionSettings(
  updates: Partial<SuggestionSettings>
): void {
  settings.update((s) => ({
    ...s,
    suggestions: { ...s.suggestions, ...updates }
  }))
}

/**
 * Set LLM provider primary + fallback chain.
 * Per 09-CONTEXT.md Area 6.
 */
export function setProviderConfig(
  primary: 'ollama' | 'openrouter',
  fallbackChain: Array<'ollama' | 'openrouter'>
): void {
  updateSuggestionSettings({
    llmProvider: primary,
    fallbackChain
  })
}

/**
 * Toggle telemetry opt-in.
 * Per 09-CONTEXT.md Area 8: local-only, opt-in.
 */
export function setTelemetryOptIn(enabled: boolean): void {
  updateSuggestionSettings({ telemetryOptIn: enabled })
}
