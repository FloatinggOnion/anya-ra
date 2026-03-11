import { invoke } from '@tauri-apps/api/core'
import { get } from 'svelte/store'
import { workspace } from '../stores/workspace'
import { chatState } from '../stores/chat'
import type { ChatHistory } from '../types/chat'

/**
 * Save the current chat state to {workspace}/chats/{chatId}.json
 */
export async function saveChatHistory(chatId: string): Promise<void> {
  const ws = get(workspace)
  if (!ws) throw new Error('No workspace selected')

  const state = get(chatState)
  const history: ChatHistory = {
    id: chatId,
    workspacePath: ws.path,
    messages: state.messages,
    draftSections: state.draftSections,
    createdAt:
      state.messages.length > 0
        ? state.messages[0].timestamp
        : new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }

  await invoke('save_chat_file', {
    workspacePath: ws.path,
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

  try {
    const content = await invoke<string>('load_chat_file', {
      workspacePath: ws.path,
      chatId
    })
    return JSON.parse(content) as ChatHistory
  } catch (err) {
    console.warn('Failed to load chat history:', err)
    return null
  }
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

/**
 * Debounced auto-save: saves chat after 2 seconds of inactivity.
 * Call this after message updates or draft accept/reject actions.
 */
export function autoSaveChatHistory(chatId: string): void {
  if (saveTimeout !== undefined) {
    clearTimeout(saveTimeout)
  }
  saveTimeout = setTimeout(() => {
    saveChatHistory(chatId).catch((err) =>
      console.error('Auto-save failed:', err)
    )
  }, 2000)
}
