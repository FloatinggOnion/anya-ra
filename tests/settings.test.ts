/**
 * Settings store tests — Phase 1.1 Unified Settings Panel (TDD).
 *
 * TDD history (verified in isolated probe while repo node_modules
 * install was blocked by a concurrent task):
 * - defaults test failed with "Cannot find module .../settings", then passed
 * - migration tests failed with "migrateFromLegacy is not a function", then passed
 * - debounce test failed with "expected undefined to be 300", then passed
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { invoke } from '@tauri-apps/api/core'
import { get } from 'svelte/store'

describe('Settings store', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.resetModules()
    vi.useRealTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('exposes versioned defaults', async () => {
    const mockInvoke = vi.mocked(invoke)
    mockInvoke.mockResolvedValueOnce(null)
    const { DEFAULT_SETTINGS, SETTINGS_VERSION } = await import(
      '../src/lib/stores/settings'
    )
    expect(SETTINGS_VERSION).toBe(1)
    expect(DEFAULT_SETTINGS.general.autoSaveMs).toBe(1000)
    expect(DEFAULT_SETTINGS.general.fontSize).toBe(14)
    expect(DEFAULT_SETTINGS.appearance.theme).toBe('auto')
    expect(DEFAULT_SETTINGS.editor.tabSize).toBe(2)
  })

  it('migrates legacy theme and provider values', async () => {
    const { migrateFromLegacy, DEFAULT_SETTINGS } = await import(
      '../src/lib/stores/settings'
    )
    const migrated = migrateFromLegacy({
      themePreference: 'dark',
      providerType: 'openrouter',
    })
    expect(migrated.appearance.theme).toBe('dark')
    expect(migrated.workspace.defaultProvider).toBe('openrouter')
    expect(migrated.version).toBe(DEFAULT_SETTINGS.version)
  })

  it('falls back to defaults for invalid legacy values', async () => {
    const { migrateFromLegacy, DEFAULT_SETTINGS } = await import(
      '../src/lib/stores/settings'
    )
    const migrated = migrateFromLegacy({
      themePreference: 'neon',
      providerType: 'bogus',
    })
    expect(migrated.appearance.theme).toBe(DEFAULT_SETTINGS.appearance.theme)
    expect(migrated.workspace.defaultProvider).toBe(
      DEFAULT_SETTINGS.workspace.defaultProvider,
    )
  })

  it('debounces persistence to 300ms and coalesces rapid updates', async () => {
    vi.useFakeTimers()
    const mockInvoke = vi.mocked(invoke)
    mockInvoke.mockResolvedValue(null)
    const { settings, updateSettings, SETTINGS_DEBOUNCE_MS } = await import(
      '../src/lib/stores/settings'
    )
    expect(SETTINGS_DEBOUNCE_MS).toBe(300)
    updateSettings({ general: { autoSaveMs: 2000, fontSize: 16 } })
    updateSettings({ general: { autoSaveMs: 2500, fontSize: 16 } })
    expect(mockInvoke).not.toHaveBeenCalledWith(
      'set_settings',
      expect.anything(),
    )
    await vi.advanceTimersByTimeAsync(300)
    expect(mockInvoke).toHaveBeenCalledTimes(1)
    expect(mockInvoke).toHaveBeenCalledWith(
      'set_settings',
      expect.objectContaining({ settings: expect.objectContaining({}) }),
    )
    expect(get(settings).general.autoSaveMs).toBe(2500)
  })
})
