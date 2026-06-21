import { Command } from '@tauri-apps/api/shell'
import { exists, resolve } from '@tauri-apps/api/path'

const COMMON_PATHS = [
  '/usr/local/bin/llama-server',
  '/usr/local/bin/server',
  '/opt/homebrew/bin/llama-server',
  '/opt/homebrew/bin/server',
  '/usr/bin/llama-server',
  '/usr/bin/server',
  '~/llama.cpp/server',
  '~/llama.cpp/build/bin/server'
]

let serverProcess: { kill(): void } | null = null

export async function detectLlamaCppBinary(): Promise<string | null> {
  for (const path of COMMON_PATHS) {
    try {
      const resolvedPath = await resolve(path)
      if (await exists(resolvedPath)) {
        return resolvedPath
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
    serverProcess.kill()
  }

  try {
    const cmd = new Command('shell', [
      binaryPath,
      '-m',
      modelPath,
      '--listen',
      'localhost',
      '--port',
      String(port),
      '--log-disable'
    ])

    serverProcess = cmd
    await cmd.spawn()
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
