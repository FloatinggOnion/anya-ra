import { writable, derived } from 'svelte/store'
import { workspace } from './workspace'
import { invoke } from '@tauri-apps/api/core'

export type Theme = 'light' | 'dark' | 'auto'

/**
 * Theme preference store
 * - 'light': Always light mode
 * - 'dark': Always dark mode
 * - 'auto': Follow system preference
 */
export const themePreference = writable<Theme>('auto')

/**
 * Computed effective theme (accounts for auto mode)
 * Returns 'light' or 'dark' (never 'auto')
 */
export const effectiveTheme = derived(themePreference, (pref) => {
  if (pref !== 'auto') return pref

  // Check system preference (light/dark)
  if (typeof window !== 'undefined' && window.matchMedia) {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
  }

  return 'light'
})

/**
 * Load theme preference from workspace storage
 */
export async function loadThemePreference() {
  try {
    const stored = localStorage.getItem('theme-preference') as Theme | null
    if (stored && ['light', 'dark', 'auto'].includes(stored)) {
      themePreference.set(stored)
    }
  } catch {
    // localStorage not available, default to 'auto'
  }
}

/**
 * Save theme preference to localStorage
 */
export async function saveThemePreference(theme: Theme) {
  try {
    localStorage.setItem('theme-preference', theme)
    themePreference.set(theme)
  } catch {
    // localStorage not available
  }
}

/**
 * Apply theme to document (updates CSS variables and class)
 */
export function applyTheme(theme: 'light' | 'dark') {
  const html = document.documentElement

  if (theme === 'dark') {
    html.classList.remove('light')
    html.classList.add('dark')
    html.style.colorScheme = 'dark'
  } else {
    html.classList.remove('dark')
    html.classList.add('light')
    html.style.colorScheme = 'light'
  }
}

/**
 * Watch for system theme changes when in auto mode
 */
export function watchSystemTheme() {
  if (typeof window === 'undefined' || !window.matchMedia) return

  const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')

  const handleChange = () => {
    // Only apply if in auto mode
    const pref = localStorage.getItem('theme-preference') as Theme | null
    if (!pref || pref === 'auto') {
      applyTheme(mediaQuery.matches ? 'dark' : 'light')
    }
  }

  // Modern API
  if (mediaQuery.addEventListener) {
    mediaQuery.addEventListener('change', handleChange)
  } else if (mediaQuery.addListener) {
    // Fallback for older browsers
    mediaQuery.addListener(handleChange)
  }
}

/**
 * Initialize theme on app load
 */
export async function initializeTheme() {
  await loadThemePreference()

  effectiveTheme.subscribe((theme) => {
    applyTheme(theme)
  })

  watchSystemTheme()
}
