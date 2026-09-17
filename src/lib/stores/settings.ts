import { writable, get } from 'svelte/store'
import { invoke } from '@tauri-apps/api/core'

export const SETTINGS_VERSION = 1
export const SETTINGS_DEBOUNCE_MS = 300

export type ThemeSetting = 'light' | 'dark' | 'auto'
export type DensitySetting = 'compact' | 'comfortable'
export type ProviderSetting = 'ollama' | 'openrouter'

export interface Settings {
  version: number
  general: { autoSaveMs: number; fontSize: number }
  appearance: { theme: ThemeSetting; density: DensitySetting }
  workspace: { defaultProvider: ProviderSetting; exportIncludePdfs: boolean }
  editor: { tabSize: number; wordWrap: boolean; lineNumbers: boolean }
}

export const DEFAULT_SETTINGS: Settings = {
  version: SETTINGS_VERSION,
  general: { autoSaveMs: 1000, fontSize: 14 },
  appearance: { theme: 'auto', density: 'comfortable' },
  workspace: { defaultProvider: 'ollama', exportIncludePdfs: true },
  editor: { tabSize: 2, wordWrap: true, lineNumbers: true },
}

export interface LegacySettingsInput {
  themePreference?: unknown
  providerType?: unknown
}

const VALID_THEMES: ThemeSetting[] = ['light', 'dark', 'auto']
const VALID_PROVIDERS: ProviderSetting[] = ['ollama', 'openrouter']

export function migrateFromLegacy(legacy: LegacySettingsInput = {}): Settings {
  const theme =
    typeof legacy.themePreference === 'string' &&
    (VALID_THEMES as string[]).includes(legacy.themePreference)
      ? (legacy.themePreference as ThemeSetting)
      : DEFAULT_SETTINGS.appearance.theme
  const provider =
    typeof legacy.providerType === 'string' &&
    (VALID_PROVIDERS as string[]).includes(legacy.providerType)
      ? (legacy.providerType as ProviderSetting)
      : DEFAULT_SETTINGS.workspace.defaultProvider
  return {
    ...structuredClone(DEFAULT_SETTINGS),
    appearance: { ...DEFAULT_SETTINGS.appearance, theme },
    workspace: { ...DEFAULT_SETTINGS.workspace, defaultProvider: provider },
  }
}

/** Read legacy values written by theme.ts / llm-provider.ts flows. */
export function readLegacyValues(): LegacySettingsInput {
  let themePreference: unknown
  try {
    themePreference = localStorage.getItem('theme-preference')
  } catch {
    themePreference = undefined
  }
  // llm-provider.ts keeps provider type only in memory (defaults to ollama);
  // API key lives in the OS keystore, so there is no legacy localStorage key.
  return { themePreference, providerType: 'ollama' }
}

function normalizeStored(raw: unknown): Settings {
  if (!raw || typeof raw !== 'object') return structuredClone(DEFAULT_SETTINGS)
  const partial = raw as Partial<Settings>
  if (partial.version !== SETTINGS_VERSION) {
    // Version mismatch: keep known-good sections, fall back to defaults.
    return {
      ...structuredClone(DEFAULT_SETTINGS),
      ...partial,
      version: SETTINGS_VERSION,
    } as Settings
  }
  return {
    ...structuredClone(DEFAULT_SETTINGS),
    ...partial,
    general: { ...DEFAULT_SETTINGS.general, ...partial.general },
    appearance: { ...DEFAULT_SETTINGS.appearance, ...partial.appearance },
    workspace: { ...DEFAULT_SETTINGS.workspace, ...partial.workspace },
    editor: { ...DEFAULT_SETTINGS.editor, ...partial.editor },
  }
}

export const settings = writable<Settings>(structuredClone(DEFAULT_SETTINGS))

let persistTimer: ReturnType<typeof setTimeout> | null = null

function schedulePersist(): void {
  if (persistTimer) clearTimeout(persistTimer)
  persistTimer = setTimeout(() => {
    persistTimer = null
    invoke('set_settings', { settings: get(settings) }).catch(() => {
      // Persistence is best-effort (e.g. browser dev without Tauri).
    })
  }, SETTINGS_DEBOUNCE_MS)
}

export type SettingsPatch = {
  general?: Partial<Settings['general']>
  appearance?: Partial<Settings['appearance']>
  workspace?: Partial<Settings['workspace']>
  editor?: Partial<Settings['editor']>
}

export function updateSettings(patch: SettingsPatch): void {
  settings.update((current) => ({
    ...current,
    general: { ...current.general, ...patch.general },
    appearance: { ...current.appearance, ...patch.appearance },
    workspace: { ...current.workspace, ...patch.workspace },
    editor: { ...current.editor, ...patch.editor },
  }))
  schedulePersist()
}

export function resetSettings(): void {
  if (persistTimer) clearTimeout(persistTimer)
  settings.set(structuredClone(DEFAULT_SETTINGS))
  schedulePersist()
}

export async function loadSettings(): Promise<Settings> {
  try {
    const stored = await invoke<Settings | null>('get_settings')
    if (stored) {
      const normalized = normalizeStored(stored)
      settings.set(normalized)
      return normalized
    }
  } catch {
    // Tauri unavailable — fall through to legacy migration.
  }
  const migrated = migrateFromLegacy(readLegacyValues())
  settings.set(migrated)
  return migrated
}
