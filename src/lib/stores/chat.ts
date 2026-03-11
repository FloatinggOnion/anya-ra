import { writable, get } from 'svelte/store'
import type { ChatState, ChatMessage, DraftSection } from '../types/chat'
import { parseDraftSections } from '../types/chat'
import type { LLMProvider, ChatOptions, Message } from '../types/llm'

const initialState: ChatState = {
  messages: [],
  isStreaming: false,
  error: null,
  draftSections: [],
  currentChatId: null
}

export const chatState = writable<ChatState>(initialState)

/**
 * Add a user message to the chat without triggering a stream.
 */
export function addUserMessage(content: string) {
  const msg: ChatMessage = {
    id: crypto.randomUUID(),
    role: 'user',
    content,
    timestamp: new Date().toISOString(),
    contextItems: []
  }
  chatState.update((s) => ({
    ...s,
    messages: [...s.messages, msg]
  }))
}

/**
 * Stream an LLM response for the given user message.
 * Automatically builds message history and handles context injection.
 */
export async function streamChat(
  userMessage: string,
  provider: LLMProvider,
  options: ChatOptions = {}
): Promise<void> {
  // Add user message
  const userMsg: ChatMessage = {
    id: crypto.randomUUID(),
    role: 'user',
    content: userMessage,
    timestamp: new Date().toISOString(),
    contextItems: []
  }

  chatState.update((s) => ({
    ...s,
    messages: [...s.messages, userMsg],
    isStreaming: true,
    error: null
  }))

  // Create assistant message placeholder
  const assistantMsgId = crypto.randomUUID()
  const assistantMsg: ChatMessage = {
    id: assistantMsgId,
    role: 'assistant',
    content: '',
    timestamp: new Date().toISOString(),
    contextItems: []
  }

  chatState.update((s) => ({
    ...s,
    messages: [...s.messages, assistantMsg]
  }))

  try {
    // Build messages array including context system message
    const messages = buildMessagesWithContext()

    // Stream response — update assistant message content incrementally
    for await (const chunk of provider.chat(messages, options)) {
      chatState.update((s) => {
        const idx = s.messages.findIndex((m) => m.id === assistantMsgId)
        if (idx === -1) return s
        const updated = [...s.messages]
        updated[idx] = { ...updated[idx], content: updated[idx].content + chunk }
        return { ...s, messages: updated }
      })
    }

    chatState.update((s) => ({ ...s, isStreaming: false }))

    // Auto-save if we have a current chat ID
    const currentState = get(chatState)
    if (currentState.currentChatId) {
      // Lazy import to avoid circular dep with chat-persistence
      import('../services/chat-persistence').then(({ autoSaveChatHistory }) => {
        if (currentState.currentChatId) {
          autoSaveChatHistory(currentState.currentChatId)
        }
      }).catch(console.error)
    }
  } catch (err) {
    chatState.update((s) => ({
      ...s,
      isStreaming: false,
      error: err instanceof Error ? err.message : 'Unknown error occurred'
    }))
  }
}

/**
 * Build the messages array, prepending a system message if context is selected.
 * Reads selectedItems from context-selection store to avoid circular imports.
 */
function buildMessagesWithContext(): Message[] {
  const state = get(chatState)
  const messages: Message[] = []

  // Attempt to get selected context items (import lazily to avoid circular deps)
  try {
    // Dynamically read context - we use a module-level reference set by context store
    const contextItems = getSelectedContextItems()

    if (contextItems.length > 0) {
      let systemContent =
        'You are a research assistant. Reference the following sources when answering:\n\n'

      for (const item of contextItems) {
        systemContent += `[${item.type.toUpperCase()}: ${item.title}]\n${item.content}\n\n`
      }

      systemContent +=
        'Use these sources to provide accurate, cited answers. Mention source titles when referencing them.\n'

      messages.push({ role: 'system', content: systemContent })
    }
  } catch {
    // Context store not yet initialized — proceed without context
  }

  // Add all existing chat messages
  for (const msg of state.messages) {
    messages.push({ role: msg.role, content: msg.content })
  }

  return messages
}

// Module-level context getter — set by context-selection store to break circular dep
let _getSelectedContextItems: () => Array<{ type: string; title: string; content: string }> = () =>
  []

export function registerContextGetter(
  fn: () => Array<{ type: string; title: string; content: string }>
) {
  _getSelectedContextItems = fn
}

function getSelectedContextItems(): Array<{ type: string; title: string; content: string }> {
  return _getSelectedContextItems()
}

// ─────────────────────────────── Draft management ──────────────────────────────

/**
 * Request draft sections from the LLM.
 * Sends an enhanced prompt asking for structured sections with markdown headers.
 */
export async function requestDraft(
  prompt: string,
  provider: LLMProvider,
  options: ChatOptions = {}
): Promise<void> {
  const draftPrompt = `Generate a draft section for a literature review based on this request: "${prompt}"\n\nProvide 2-3 paragraphs with clear section headers. Format with markdown (## Header).`

  await streamChat(draftPrompt, provider, options)

  // Parse draft sections from the last assistant message
  chatState.update((s) => {
    const lastMessage = s.messages[s.messages.length - 1]
    if (lastMessage && lastMessage.role === 'assistant' && lastMessage.content.length > 0) {
      const sections = parseDraftSections(lastMessage.content)
      const updatedMessages = [...s.messages]
      updatedMessages[updatedMessages.length - 1] = {
        ...lastMessage,
        draftSections: sections
      }
      return {
        ...s,
        draftSections: sections,
        messages: updatedMessages
      }
    }
    return s
  })
}

export function acceptDraft(sectionId: string) {
  chatState.update((s) => {
    const sections = s.draftSections.map((d) =>
      d.id === sectionId ? { ...d, accepted: true, rejected: false } : d
    )
    return { ...s, draftSections: sections }
  })
  triggerAutoSave()
}

export function rejectDraft(sectionId: string) {
  chatState.update((s) => {
    const sections = s.draftSections.map((d) =>
      d.id === sectionId ? { ...d, rejected: true, accepted: false } : d
    )
    return { ...s, draftSections: sections }
  })
  triggerAutoSave()
}

export function editDraft(sectionId: string, editedContent: string) {
  chatState.update((s) => {
    const sections = s.draftSections.map((d) =>
      d.id === sectionId ? { ...d, editedContent, accepted: true } : d
    )
    return { ...s, draftSections: sections }
  })
  triggerAutoSave()
}

export function getAcceptedDrafts(): DraftSection[] {
  const state = get(chatState)
  return state.draftSections
    .filter((d) => d.accepted && !d.rejected)
    .sort((a, b) => a.position - b.position)
}

export async function exportAcceptedDrafts(): Promise<string> {
  const drafts = getAcceptedDrafts()
  return drafts.map((d) => d.editedContent || d.content).join('\n\n')
}

export function clearChat() {
  chatState.set(initialState)
}

/**
 * Set the current chat ID (called by persistence layer when loading/creating a chat).
 */
export function setChatId(chatId: string) {
  chatState.update((s) => ({ ...s, currentChatId: chatId }))
}

/**
 * Internal helper to trigger auto-save when state changes.
 */
function triggerAutoSave() {
  const state = get(chatState)
  if (state.currentChatId) {
    import('../services/chat-persistence')
      .then(({ autoSaveChatHistory }) => {
        const currentState = get(chatState)
        if (currentState.currentChatId) {
          autoSaveChatHistory(currentState.currentChatId)
        }
      })
      .catch(console.error)
  }
}
