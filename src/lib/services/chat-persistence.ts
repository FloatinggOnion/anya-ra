import { invoke } from '@tauri-apps/api/core'
import { get } from 'svelte/store'
import { workspace } from '../stores/workspace'
import { chatState } from '../stores/chat'
import type { ChatHistory, ChatState } from '../types/chat'

/**
 * Save the current chat state to {workspace}/chats/{chatId}.json
 */
export async function saveChatHistory(chatId: string, snapshot?: ChatState, workspacePath = get(workspace)?.path): Promise<void> {
  if (!workspacePath) throw new Error('No workspace selected')

  const state = snapshot ?? get(chatState)
  const history: ChatHistory = {
    id: chatId,
    workspacePath,
    messages: state.messages,
    draftSections: state.draftSections,
    createdAt:
      state.messages.length > 0
        ? state.messages[0].timestamp
        : new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }

  await invoke('save_chat_file', {
    workspacePath,
    chatId,
    content: JSON.stringify(history, null, 2)
  })
}

/**
 * Load a chat history by ID from {workspace}/chats/{chatId}.json
 * Returns null if the file doesn't exist.
 */
export async function loadChatHistory(chatId: string): Promise<ChatHistory | null> {
  const ws = get(workspace)
  if (!ws) throw new Error('No workspace selected')

    const content = await invoke<string | null>('load_chat_file', {
      workspacePath: ws.path,
      chatId
    })
    if (!content) return null
    const history = JSON.parse(content) as ChatHistory
    if (!Array.isArray(history.messages) || !Array.isArray(history.draftSections)) throw new Error('This conversation could not be read.')
    return history
}

/**
 * Create a new chat session with an empty history.
 * Returns the new chat ID.
 */
export async function createNewChat(): Promise<string> {
  const chatId = crypto.randomUUID()
  await saveChatHistory(chatId)
  return chatId
}

/**
 * List all chat IDs saved in the workspace.
 */
export async function listChatFiles(): Promise<string[]> {
  const ws = get(workspace)
  if (!ws) return []

  try {
    return await invoke<string[]>('list_chat_files', {
      workspacePath: ws.path
    })
  } catch (err) {
    console.warn('Failed to list chat files:', err)
    return []
  }
}

// Debounce timer for auto-save
let saveTimeout: ReturnType<typeof setTimeout> | undefined
let openRequest = 0

export async function openChatSession(chatId: string): Promise<void> {
  const request = ++openRequest
  const workspacePath = get(workspace)?.path
  const state = get(chatState)
  if (state.currentChatId === chatId) return
  if (state.isStreaming) throw new Error('Wait for the current response before switching conversations.')
  if (saveTimeout) { clearTimeout(saveTimeout); saveTimeout = undefined }
  if (state.currentChatId) await saveChatHistory(state.currentChatId, state)
  const history = await loadChatHistory(chatId)
  if (request !== openRequest || get(workspace)?.path !== workspacePath) return
  chatState.set({
    messages: history?.messages ?? [], draftSections: history?.draftSections ?? [],
    currentChatId: chatId, isStreaming: false, error: null,
  })
}

/**
 * Debounced auto-save: saves chat after 2 seconds of inactivity.
 * Call this after message updates or draft accept/reject actions.
 */
export function autoSaveChatHistory(chatId: string): void {
  const snapshot = get(chatState)
  const workspacePath = get(workspace)?.path
  if (!workspacePath) return
  if (saveTimeout !== undefined) {
    clearTimeout(saveTimeout)
  }
  saveTimeout = setTimeout(() => {
    saveChatHistory(chatId, snapshot, workspacePath).catch((err) =>
      console.error('Auto-save failed:', err)
    )
  }, 2000)
}
