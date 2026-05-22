/**
 * SuggestionDecorations.ts — DEPRECATED.
 *
 * Ghost-text and block suggestion widgets have been removed as part of the
 * Phase 9 UX rethink (sidebar companion model). This file is kept as a
 * placeholder to prevent import errors in any unrefactored code paths.
 *
 * All suggestion rendering now happens in SuggestionsSidebar.svelte.
 */

import { StateField } from '@codemirror/state'

/** No-op StateField — suggestions are no longer rendered as CodeMirror decorations */
export const suggestionField = StateField.define<null>({
  create() { return null },
  update(state) { return state }
})
