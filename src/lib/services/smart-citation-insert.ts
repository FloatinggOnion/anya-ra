import type { Paper } from '../types/paper'
import type { CitationStyle, SidebarSuggestionItem } from '../types/suggestion'
import { get } from 'svelte/store'
import { settings } from '../stores/settings'

const FRAMING_PHRASES: string[] = []

const _paperFrameIndex = new Map<string, number>()

function getFramingText(paperId: string): string {
  return ''
}

export function _resetFramingState(): void {}

export function formatAuthorName(authors: string[]): string {
  return ''
}

export function formatPaperCitation(paper: Paper, style: CitationStyle): string {
  return ''
}

export function generateCitation(
  item: SidebarSuggestionItem,
  paper?: Paper | null,
): string {
  return ''
}

export function getCitationStyle(): CitationStyle {
  return 'author-year'
}
