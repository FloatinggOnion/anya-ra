/**
 * Chat message and state types for the LLM chat interface.
 */

export interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: string
  contextItems: string[]
  draftSections?: DraftSection[]
}

export interface ChatState {
  messages: ChatMessage[]
  isStreaming: boolean
  error: string | null
  draftSections: DraftSection[]
  currentChatId: string | null
}

export interface DraftSection {
  id: string
  content: string
  accepted: boolean
  rejected: boolean
  editedContent: string | null
  position: number
}

export interface ChatHistory {
  id: string
  workspacePath: string
  messages: ChatMessage[]
  draftSections: DraftSection[]
  createdAt: string
  updatedAt: string
}

/**
 * Parse an LLM response into discrete draft sections.
 * Splits by markdown headers (## ...) or double newlines.
 * Filters fragments shorter than 50 characters.
 */
export function parseDraftSections(content: string): DraftSection[] {
  const sections = content
    .split(/\n##\s+|\n\n/)
    .filter((s) => s.trim().length > 50)
    .map((sectionContent, i) => ({
      id: crypto.randomUUID(),
      content: sectionContent.trim(),
      accepted: false,
      rejected: false,
      editedContent: null,
      position: i
    }))

  return sections
}
