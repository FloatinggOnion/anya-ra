import { Command, type Child } from '@tauri-apps/plugin-shell'
import { exists } from '@tauri-apps/plugin-fs'

/**
 * Tauri v2's shell plugin requires every executable path to be explicitly
 * allow-listed in src-tauri/capabilities/default.json under shell:allow-execute
 * (no wildcards or variable expansion, by design). Auto-detection is therefore
 * limited to these fixed system install paths, which are mirrored exactly in
 * that capability file. A binary picked via a file dialog at a different path
 * cannot be launched — only detected paths from this list are executable.
 */
const COMMON_PATHS = [
  '/usr/local/bin/llama-server',
  '/usr/local/bin/server',
  '/opt/homebrew/bin/llama-server',
  '/opt/homebrew/bin/server',
  '/usr/bin/llama-server',
  '/usr/bin/server'
]

let serverProcess: Child | null = null

export async function detectLlamaCppBinary(): Promise<string | null> {
  for (const path of COMMON_PATHS) {
    try {
      if (await exists(path)) {
        return path
      }
    } catch {
      continue
    }
  }
  return null
}

export async function launchServer(
  binaryPath: string,
  modelPath: string,
  port: number = 8000
): Promise<void> {
  // Kill existing server if one is running
  if (serverProcess) {
    await serverProcess.kill()
    serverProcess = null
  }

  try {
    const cmd = Command.create(binaryPath, [
      '-m',
      modelPath,
      '--listen',
      'localhost',
      '--port',
      String(port),
      '--log-disable'
    ])

    serverProcess = await cmd.spawn()
  } catch (error) {
    throw new Error(`Failed to launch llama.cpp server: ${error instanceof Error ? error.message : String(error)}`)
  }
}

export async function isServerReady(
  host: string = 'localhost',
  port: number = 8000,
  maxRetries: number = 10
): Promise<boolean> {
  for (let i = 0; i < maxRetries; i++) {
    try {
      const response = await fetch(`http://${host}:${port}/health`, {
        signal: AbortSignal.timeout(1000)
      })
      if (response.ok) {
        return true
      }
    } catch {
      // Server not ready yet, wait and retry
    }

    await new Promise(resolve => setTimeout(resolve, 1000))
  }

  return false
}

export function stopServer(): void {
  if (serverProcess) {
    serverProcess.kill()
    serverProcess = null
  }
}
