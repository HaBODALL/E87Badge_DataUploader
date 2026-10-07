import { describe, it, expect, vi } from 'vitest'
import { getStorageInfoE87 } from '../device-ops'
import { E87Client } from '../e87-protocol'

// We need to mock e87-protocol because device-ops imports browseFilesE87 directly
vi.mock('../e87-protocol', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../e87-protocol')>()
  return {
    ...actual,
    browseFilesE87: vi.fn().mockImplementation((conn) => {
      if (conn.shouldThrow) throw new Error('Mock error');
      return Promise.resolve([
        { sizeBytes: 100000 },
        { sizeBytes: 200000 }
      ]);
    })
  }
})

describe('device-ops', () => {
  describe('getStorageInfoE87', () => {
    it('returns null if client or connection is missing', async () => {
      expect(await getStorageInfoE87(null as any)).toBeNull()

      const clientWithoutConn = new E87Client()
      expect(await getStorageInfoE87(clientWithoutConn)).toBeNull()
    })

    it('calculates storage info correctly on success', async () => {
      const client = new E87Client()
      client.connection = { shouldThrow: false } as any // mock connection
      const info = await getStorageInfoE87(client)

      expect(info).not.toBeNull()
      expect(info?.usedBytes).toBe(300000)
      expect(info?.totalBytes).toBe(900000)
      expect(info?.freeBytes).toBe(600000)
      expect(info?.usagePercent).toBeCloseTo(33.33, 2)
    })

    it('returns null if browseFilesE87 throws an error', async () => {
      const client = new E87Client()
      client.connection = { shouldThrow: true } as any // mock connection that triggers throw
      const info = await getStorageInfoE87(client)
      expect(info).toBeNull()
    })
  })
})
