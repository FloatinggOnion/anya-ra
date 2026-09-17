/**
 * Phase 1.2 Keyboard Shortcuts Expansion — TDD tests.
 * - Config completeness (26 shortcuts, categories, no duplicate combos)
 * - Handler mapping (new combos delegate via callbacks map, existing Cmd+? kept)
 */
import { describe, it, expect, vi } from 'vitest'
import { KEYBOARD_SHORTCUTS } from '../src/lib/config/keyboard-shortcuts'
import { createKeyboardHandlers } from '../src/lib/services/keyboard-handler'

function comboKey(keys: string[]): string {
  return keys.join('+')
}

function keydown(init: KeyboardEventInit & { key: string }): KeyboardEvent {
  return new KeyboardEvent('keydown', { bubbles: true, cancelable: true, ...init })
}

describe('keyboard-shortcuts config', () => {
  it('has ~26 shortcuts', () => {
    expect(KEYBOARD_SHORTCUTS.length).toBeGreaterThanOrEqual(25)
    expect(KEYBOARD_SHORTCUTS.length).toBeLessThanOrEqual(27)
  })

  it('covers all required categories', () => {
    const cats = new Set(KEYBOARD_SHORTCUTS.map((s) => s.category))
    for (const c of [
      'global',
      'navigation',
      'editor',
      'search',
      'papers',
      'graph',
      'chat',
      'export',
    ]) {
      expect(cats.has(c as never)).toBe(true)
    }
  })

  it('keeps existing entries', () => {
    const combos = KEYBOARD_SHORTCUTS.map((s) => comboKey(s.keys))
    expect(combos).toContain('Cmd+K')
    expect(combos).toContain('Cmd+?')
    expect(combos).toContain('Esc')
    expect(combos).toContain('Cmd+Enter')
  })

  it('contains all required new combos', () => {
    const combos = KEYBOARD_SHORTCUTS.map((s) => comboKey(s.keys))
    const required = [
      'Cmd+1',
      'Cmd+2',
      'Cmd+3',
      'Cmd+4',
      'Cmd+5',
      'Cmd+6',
      'Cmd+Shift+[',
      'Cmd+Shift+]',
      'Cmd+Shift+P',
      'Cmd+N',
      'Cmd+S',
      'Cmd+E',
      'Cmd+/',
      'Ctrl+Tab',
      'Cmd+Shift+F',
      'Cmd+Shift+N',
      'Cmd+Shift+G',
      'Cmd+Shift+C',
      'Cmd+D',
      'Cmd+Shift+E',
    ]
    for (const r of required) {
      expect(combos, `missing ${r}`).toContain(r)
    }
  })

  it('has no duplicate combos', () => {
    const combos = KEYBOARD_SHORTCUTS.map((s) => comboKey(s.keys))
    expect(new Set(combos).size).toBe(combos.length)
  })
})

describe('keyboard-handler mapping', () => {
  it('keeps existing Cmd+? behavior (legacy single-callback API)', () => {
    const onToggle = vi.fn()
    const handlers = createKeyboardHandlers(onToggle)
    handlers.handleKeydown(keydown({ key: '/', metaKey: true, shiftKey: true }))
    expect(onToggle).toHaveBeenCalledTimes(1)
  })

  it('delegates new combos via callbacks map (no direct store actions)', () => {
    const actions = {
      'focus-tab-1': vi.fn(),
      'next-tab': vi.fn(),
      'prev-tab': vi.fn(),
      'command-palette': vi.fn(),
      'focus-search': vi.fn(),
      'focus-paper-search': vi.fn(),
      'focus-graph': vi.fn(),
      'focus-chat': vi.fn(),
      'download-pdf': vi.fn(),
      'export-workspace': vi.fn(),
    }
    const handlers = createKeyboardHandlers(() => {}, actions as never)

    handlers.handleKeydown(keydown({ key: '1', metaKey: true }))
    expect(actions['focus-tab-1']).toHaveBeenCalledTimes(1)

    handlers.handleKeydown(keydown({ key: ']', metaKey: true, shiftKey: true }))
    expect(actions['next-tab']).toHaveBeenCalledTimes(1)

    handlers.handleKeydown(keydown({ key: '[', metaKey: true, shiftKey: true }))
    expect(actions['prev-tab']).toHaveBeenCalledTimes(1)

    handlers.handleKeydown(keydown({ key: 'P', metaKey: true, shiftKey: true }))
    expect(actions['command-palette']).toHaveBeenCalledTimes(1)

    handlers.handleKeydown(keydown({ key: 'F', metaKey: true, shiftKey: true }))
    expect(actions['focus-search']).toHaveBeenCalledTimes(1)

    handlers.handleKeydown(keydown({ key: 'N', metaKey: true, shiftKey: true }))
    expect(actions['focus-paper-search']).toHaveBeenCalledTimes(1)

    handlers.handleKeydown(keydown({ key: 'G', metaKey: true, shiftKey: true }))
    expect(actions['focus-graph']).toHaveBeenCalledTimes(1)

    handlers.handleKeydown(keydown({ key: 'C', metaKey: true, shiftKey: true }))
    expect(actions['focus-chat']).toHaveBeenCalledTimes(1)

    handlers.handleKeydown(keydown({ key: 'd', metaKey: true }))
    expect(actions['download-pdf']).toHaveBeenCalledTimes(1)

    handlers.handleKeydown(keydown({ key: 'E', metaKey: true, shiftKey: true }))
    expect(actions['export-workspace']).toHaveBeenCalledTimes(1)
  })

  it('handles panel focus (Ctrl+Tab) and help (Cmd+/) via callbacks', () => {
    const actions = { 'focus-next-panel': vi.fn(), 'show-help': vi.fn() }
    const handlers = createKeyboardHandlers(() => {}, actions as never)
    handlers.handleKeydown(keydown({ key: 'Tab', ctrlKey: true }))
    expect(actions['focus-next-panel']).toHaveBeenCalledTimes(1)
    handlers.handleKeydown(keydown({ key: '/', metaKey: true }))
    expect(actions['show-help']).toHaveBeenCalledTimes(1)
  })

  it('does nothing when no callback registered (no store side effects)', () => {
    const handlers = createKeyboardHandlers(() => {})
    expect(() =>
      handlers.handleKeydown(keydown({ key: '1', metaKey: true }))
    ).not.toThrow()
  })
})
