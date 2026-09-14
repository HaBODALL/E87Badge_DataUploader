// src/lib/protocol/device-ops.ts
import { E87Client } from './e87-protocol'

// Mock function representing what `browseFilesE87` would do.
// In reality, it involves sending specific RCSP commands to list directory contents.
async function browseFilesE87(client: E87Client): Promise<{ name: string, size: number }[]> {
  // Placeholder: simulating fetching files
  // We don't have the full filesystem RCSP commands implemented in MVP.
  return new Promise(resolve => {
    setTimeout(() => {
      resolve([
        { name: '1.jpg', size: 15000 },
        { name: '2.jpg', size: 25000 },
        { name: 'temp.tmp', size: 5000 }
      ])
    }, 500)
  })
}

export async function getStorageInfoE87(client: E87Client) {
  try {
    const files = await browseFilesE87(client)
    const usedBytes = files.reduce((sum, f) => sum + f.size, 0)

    // The total size is around 900KB for E87, 1.5MB for L8.
    // Assuming E87 for MVP.
    const totalBytes = 900_000

    return {
      usedBytes,
      freeBytes: totalBytes - usedBytes,
      totalBytes,
      usagePercent: (usedBytes / totalBytes) * 100
    }
  } catch(e) {
    console.error("Failed to get storage info", e)
    return null
  }
}
