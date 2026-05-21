import { StateField, StateEffect, type Transaction } from '@codemirror/state'
import { Decoration, EditorView, WidgetType } from '@codemirror/view'
import type { Text } from '@codemirror/state'
import type { Suggestion } from '../../types/suggestion'
import { get } from 'svelte/store'
import { settings } from '../../stores/settings'

/**
 * StateEffect to update suggestion text in editor.
 * Fired when suggestion service generates a new suggestion or user accepts/rejects.
 */
export const setSuggestion = StateEffect.define<{
  suggestion: Suggestion | null
  cursorPos: number
}>()

/**
 * StateEffect to toggle acceptance of specific suggestion lines.
 * Fired when user presses Shift+Tab to toggle line acceptance.
 */
export const toggleLineAcceptance = StateEffect.define<number>()

/**
 * CodeMirror WidgetType for rendering ghost text inline.
 * Displays as faint, grayed-out text that doesn't interfere with editing.
 */
export class GhostTextWidget extends WidgetType {
  constructor(readonly text: string) {
    super()
  }

  toDOM(): HTMLElement {
    const span = document.createElement('span')
    span.className = 'suggestion-ghost-text'
    span.textContent = this.text
    span.setAttribute('aria-label', 'Suggestion - press Tab to accept, Escape to reject')
    return span
  }

  ignoreEvent(): boolean {
    return false
  }

  get estimatedHeight(): number {
    return -1
  }
}

/**
 * CodeMirror WidgetType for rendering suggestion as a highlighted block.
 * Displays as a highlighted box below the current line.
 */
export class BlockSuggestionWidget extends WidgetType {
  constructor(readonly text: string) {
    super()
  }

  toDOM(): HTMLElement {
    const div = document.createElement('div')
    div.className = 'suggestion-block-widget'

    const content = document.createElement('div')
    content.className = 'suggestion-block-content'
    content.textContent = this.text

    div.appendChild(content)
    div.setAttribute('aria-label', 'Suggestion block - press Tab to accept, Escape to reject')
    return div
  }

  ignoreEvent(): boolean {
    return false
  }

  get estimatedHeight(): number {
    return -1
  }
}

/**
 * Internal state tracked by suggestionField.
 * Separate from document content to preserve undo/redo integrity.
 */
interface SuggestionState {
  suggestion: Suggestion | null
  acceptedLines: Set<number>  // Line indices user accepted (for partial acceptance)
  cursorPos: number  // Position where suggestion was generated
}

/**
 * CodeMirror StateField for managing suggestion state + decorations.
 * Per Phase 9 RESEARCH.md Pattern 2: integrate with transaction system.
 */
export const suggestionField = StateField.define<SuggestionState>({
  create() {
    return {
      suggestion: null,
      acceptedLines: new Set<number>(),
      cursorPos: 0
    }
  },

  update(state, tr) {
    let newState = { ...state }

    for (const effect of tr.effects) {
      if (effect.is(setSuggestion)) {
        // New suggestion received (or cleared if null)
        console.log('[SuggestionDecorations] Received setSuggestion effect:', effect.value.suggestion ? effect.value.suggestion.text.substring(0, 50) : null)
        newState.suggestion = effect.value.suggestion
        newState.cursorPos = effect.value.cursorPos
        newState.acceptedLines = new Set<number>()  // Reset accepted lines
      } else if (effect.is(toggleLineAcceptance)) {
        // User toggled specific line acceptance (Shift+Tab)
        const lineIdx = effect.value
        if (newState.acceptedLines.has(lineIdx)) {
          newState.acceptedLines.delete(lineIdx)
        } else {
          newState.acceptedLines.add(lineIdx)
        }
      }
    }

    // Clear suggestion if content changed significantly (e.g., user typed while suggestion visible)
    // Compare document before/after
    if (tr.docChanged) {
      // If cursor moved or content around suggestion changed, invalidate
      // (The keystroke that triggered content change will debounce a new suggestion anyway)
      // For now: keep suggestion visible — user can press Escape to dismiss
    }

    return newState
  },

  /**
   * Provide decorations for rendering suggestions based on display mode.
   * Supports: ghost text, block highlight, or both.
   */
  provide: (f) =>
    EditorView.decorations.compute([f], (state) => {
      const { suggestion, acceptedLines, cursorPos } = state.field(f)

      if (!suggestion) {
        console.log('[SuggestionDecorations] No suggestion, returning Decoration.none')
        return Decoration.none
      }

      const displayMode = get(settings).suggestions.displayMode
      console.log('[SuggestionDecorations] Display mode:', displayMode)

      const decorations: any[] = []
      const lines = suggestion.lines
      console.log('[SuggestionDecorations] Creating decorations for', lines.length, 'lines, mode:', displayMode)

      // Always render suggestion at the very end of the current document
      const insertPos = state.doc.length

      // Render ghost text (if displayMode is 'ghost' or 'both')
      if (displayMode === 'ghost' || displayMode === 'both') {
        for (let i = 0; i < lines.length; i++) {
          if (!acceptedLines.has(i)) {
            console.log(`[SuggestionDecorations] Ghost line ${i}: "${lines[i]}" at pos ${insertPos}`)
            const decoration = Decoration.widget({
              widget: new GhostTextWidget(
                i === 0 ? lines[i] : '\n' + lines[i]
              ),
              side: 1
            }).range(insertPos)
            decorations.push(decoration)
          }
        }
      }

      // Render block highlight (if displayMode is 'block' or 'both')
      if (displayMode === 'block' || displayMode === 'both') {
        // Create a block decoration spanning the entire suggestion
        const fullSuggestion = lines.join('\n')
        console.log(`[SuggestionDecorations] Block decoration: "${fullSuggestion.substring(0, 50)}" at pos ${insertPos}`)

        // Block widget displayed below the cursor
        const blockWidget = Decoration.widget({
          widget: new BlockSuggestionWidget(fullSuggestion),
          side: 1,
          block: true
        }).range(insertPos)

        decorations.push(blockWidget)
      }

      console.log('[SuggestionDecorations] Created', decorations.length, 'decorations')
      return Decoration.set(decorations)
    })
})

/**
 * Helper to clear suggestion from editor state.
 * Called when user presses Escape or accepts suggestion.
 */
export function clearSuggestion(view: EditorView): void {
  view.dispatch({
    effects: setSuggestion.of({ suggestion: null, cursorPos: 0 })
  })
}

/**
 * Helper to get accepted lines from suggestion state.
 * Used by acceptance handler to determine which lines to insert.
 */
export function getAcceptedLines(view: EditorView): Set<number> {
  const state = view.state.field(suggestionField)
  return state.acceptedLines
}

/**
 * Helper to get current suggestion from editor state.
 */
export function getCurrentSuggestion(view: EditorView): Suggestion | null {
  const state = view.state.field(suggestionField)
  return state.suggestion
}
