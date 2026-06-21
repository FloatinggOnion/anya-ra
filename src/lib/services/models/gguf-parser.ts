export interface GGUFMetadata {
  quantization: string | null
  parameterCount: string | null
  contextSize: number | null
  fileSize: number
}

export function parseGGUFFilename(filePath: string): GGUFMetadata {
  const fileName = filePath.split('/').pop() || filePath
  let quantization: string | null = null
  let parameterCount: string | null = null

  // Parse quantization format from filename (Q4_K_M, Q5_K_S, Q8_0, etc.)
  const quantMatch = fileName.match(/\.(Q\d[_\w]+)(?:\.gguf)?$/i)
  if (quantMatch) {
    quantization = quantMatch[1]
  }

  // Parse parameter count from filename (0.5b, 1.5b, 7b, 13b, etc.)
  const paramMatch = fileName.match(/(\d+(?:\.\d+)?)[bB](?:ilion)?/)
  if (paramMatch) {
    parameterCount = paramMatch[1] + 'B'
  }

  // File size would need to be fetched separately via Tauri; defaulting to 0 here
  // The actual file size will be retrieved via Tauri fs API when needed
  return {
    quantization,
    parameterCount,
    contextSize: null, // Would require reading GGUF file header; marked for future enhancement
    fileSize: 0 // Placeholder; actual size retrieved separately
  }
}

export function formatFileSize(bytes: number): string {
  const units = ['B', 'KB', 'MB', 'GB']
  let size = bytes
  let unitIndex = 0

  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024
    unitIndex++
  }

  return `${size.toFixed(1)} ${units[unitIndex]}`
}
