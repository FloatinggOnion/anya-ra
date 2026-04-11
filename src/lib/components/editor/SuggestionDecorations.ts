import { StateField, StateEffect, type Transaction } from '@codemirror/state'
import { Decoration, EditorView, WidgetType } from '@codemirror/view'
import type { Text } from '@codemirror/state'
import type { Suggestion } from '../../types/suggestion'

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
  constructor(readonly text: string) {}

  toDOM(): HTMLElement {
    const span = document.createElement('span')
    span.className = 'suggestion-ghost-text'
    span.textContent = this.text
    span.setAttribute('aria-label', 'Suggestion - press Tab to accept, Escape to reject')
    return span
  }

  ignoreEvent(): boolean {
    return false  // Allow events through
  }

  get estimatedHeight(): number {
    // Return -1 to let CodeMirror measure
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
   * Provide decorations for rendering ghost text.
   * Only create decoration for non-accepted lines.
   */
  provide: (f) =>
    EditorView.decorations.compute([f], (state) => {
      const { suggestion, acceptedLines, cursorPos } = state.field(f)

      if (!suggestion) {
        return Decoration.none
      }

      const decorations = []
      const lines = suggestion.lines

      for (let i = 0; i < lines.length; i++) {
        if (!acceptedLines.has(i)) {
          // Create decoration for non-accepted line
          // Insert after cursor position (or at end of current line)
          const pos = state.doc.length > cursorPos ? cursorPos : state.doc.length

          const decoration = Decoration.widget({
            widget: new GhostTextWidget(
              i === 0 ? lines[i] : '\n' + lines[i]
            ),
            side: 1  // Insert after cursor (positive side)
          }).range(pos)

          decorations.push(decoration)
        }
      }

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
