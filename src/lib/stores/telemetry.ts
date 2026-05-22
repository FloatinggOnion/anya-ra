import { get } from 'svelte/store'
import { invoke } from '@tauri-apps/api/core'
import { workspace } from './workspace'
import { settings } from './settings'
import type { TelemetryRecord, TelemetryStats } from '../types/suggestion'

/**
 * In-memory telemetry buffer for the current session.
 * Persisted to workspace/.anya/telemetry.json on shutdown or manual save.
 * Per 09-CONTEXT.md Area 8: local-only, no network transmission.
 */
let telemetryBuffer: TelemetryRecord[] = []

/**
 * Record suggestion acceptance (full or partial).
 * Silently ignores if telemetry opt-in disabled.
 */
export function recordAcceptance(
  docId: string,
  provider: 'ollama' | 'openrouter',
  acceptanceType: 'full' | 'partial',
  totalLines: number,
  acceptedLines?: number
): void {
  const optIn = get(settings).suggestions.telemetryOptIn
  if (!optIn) return

  telemetryBuffer.push({
    docId,
    provider,
    type: acceptanceType === 'full' ? 'accept' : 'partial',
    lineCount: totalLines,
    acceptedCount: acceptedLines,
    timestamp: Date.now()
  })

  // Auto-persist every 10 records (batch writes)
  if (telemetryBuffer.length % 10 === 0) {
    persistTelemetry()
  }
}

/**
 * Record suggestion rejection.
 */
export function recordRejection(
  docId: string,
  provider: 'ollama' | 'openrouter'
): void {
  const optIn = get(settings).suggestions.telemetryOptIn
  if (!optIn) return

  telemetryBuffer.push({
    docId,
    provider,
    type: 'reject',
    lineCount: 0,
    timestamp: Date.now()
  })
}

/**
 * Record a sidebar click-to-insert event (D-11).
 * Called when user clicks a suggestion card in the sidebar to insert text into the document.
 * Silently ignores if telemetry opt-in is disabled.
 *
 * @param docId - Current document ID
 * @param provider - Which provider generated the suggestion ('paper-keyword' | 'ollama' | 'openrouter')
 * @param suggestionType - Type of suggestion clicked ('paper' | 'completion')
 */
export function recordInsertion(
  docId: string,
  provider: string,
  suggestionType: string
): void {
  const optIn = get(settings).suggestions.telemetryOptIn
  if (!optIn) return

  const mappedProvider: 'ollama' | 'openrouter' =
    provider === 'paper-keyword' ? 'ollama' : (provider as 'ollama' | 'openrouter')

  telemetryBuffer.push({
    docId,
    provider: mappedProvider,
    type: 'accept',    // Click-to-insert is always a full acceptance in sidebar model
    lineCount: 1,      // Single insertion per click
    timestamp: Date.now()
  })

  // Auto-persist every 10 records (batch writes)
  if (telemetryBuffer.length % 10 === 0) {
    persistTelemetry()
  }
}

/**
 * Get aggregate telemetry statistics.
 * Computed from in-memory buffer + persisted records.
 */
export async function getTelemetryStats(): Promise<TelemetryStats> {
  const allRecords = await loadTelemetryRecords()
  allRecords.push(...telemetryBuffer)

  const total = allRecords.length
  if (total === 0) {
    return {
      totalSuggestions: 0,
      accepted: 0,
      rejected: 0,
      partial: 0,
      acceptanceRate: 0,
      byProvider: {
        ollama: { count: 0, acceptanceRate: 0 },
        openrouter: { count: 0, acceptanceRate: 0 }
      }
    }
  }

  const stats: TelemetryStats = {
    totalSuggestions: total,
    accepted: allRecords.filter((r) => r.type === 'accept').length,
    rejected: allRecords.filter((r) => r.type === 'reject').length,
    partial: allRecords.filter((r) => r.type === 'partial').length,
    acceptanceRate: 0,
    byProvider: {
      ollama: { count: 0, acceptanceRate: 0 },
      openrouter: { count: 0, acceptanceRate: 0 }
    }
  }

  stats.acceptanceRate =
    (stats.accepted + stats.partial) / (stats.totalSuggestions || 1)

  for (const provider of ['ollama', 'openrouter'] as const) {
    const providerRecords = allRecords.filter((r) => r.provider === provider)
    const providerTotal = providerRecords.length
    const providerAccepted = providerRecords.filter(
      (r) => r.type === 'accept' || r.type === 'partial'
    ).length

    stats.byProvider[provider] = {
      count: providerTotal,
      acceptanceRate: providerTotal > 0 ? providerAccepted / providerTotal : 0
    }
  }

  return stats
}

/**
 * Get click-to-insert count from telemetry records.
 * Filters for 'accept' type records (which in the sidebar model are click-to-insert events).
 */
export async function getInsertionCount(): Promise<number> {
  const allRecords = await loadTelemetryRecords()
  allRecords.push(...telemetryBuffer)
  return allRecords.filter(r => r.type === 'accept').length
}

/**
 * Clear all telemetry history (user-initiated via Settings).
 */
export async function clearTelemetry(): Promise<void> {
  telemetryBuffer = []
  const ws = get(workspace)
  if (!ws) return

  try {
    await invoke('clear_telemetry', { workspacePath: ws.path })
    console.log('[telemetry] Cleared')
  } catch (err) {
    console.error('[telemetry] Clear failed:', err)
  }
}

/**
 * Load persisted telemetry records from workspace.
 */
async function loadTelemetryRecords(): Promise<TelemetryRecord[]> {
  const ws = get(workspace)
  if (!ws) return []

  try {
    const content = await invoke<string | null>('load_telemetry', {
      workspacePath: ws.path
    })
    if (content) {
      return JSON.parse(content) as TelemetryRecord[]
    }
  } catch (err) {
    console.error('[telemetry] Load failed:', err)
  }

  return []
}

/**
 * Persist telemetry buffer to workspace.
 */
async function persistTelemetry(): Promise<void> {
  const ws = get(workspace)
  if (!ws || telemetryBuffer.length === 0) return

  try {
    await invoke('save_telemetry', {
      workspacePath: ws.path,
      records: JSON.stringify(telemetryBuffer, null, 2)
    })
    console.log('[telemetry] Persisted', telemetryBuffer.length, 'records')
  } catch (err) {
    console.error('[telemetry] Persist failed:', err)
  }
}

/**
 * Flush telemetry on app shutdown.
 * Called from App.svelte cleanup.
 */
export async function flushTelemetry(): Promise<void> {
  await persistTelemetry()
}
