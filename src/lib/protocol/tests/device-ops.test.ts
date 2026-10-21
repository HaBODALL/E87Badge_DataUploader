import { describe, it, expect, vi } from 'vitest'
import { createDeviceOps, getStorageInfoE87 } from '../device-ops'
import { E87Client } from '../e87-protocol'

// We need to mock e87-protocol because device-ops imports protocol functions
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
    }),
    refreshBatteryE87: vi.fn().mockResolvedValue({ level: 85, updatedAt: '12:00:00', charging: false }),
    getBrightnessE87: vi.fn().mockResolvedValue(50),
    setBrightnessE87: vi.fn().mockResolvedValue(undefined),
  }
})

describe('device-ops', () => {
  describe('createDeviceOps', () => {
    function createMockCallbacks(connection: any = null) {
      return {
        log: vi.fn(),
        setStatus: vi.fn(),
        setBusy: vi.fn(),
        setBattery: vi.fn(),
        setBrightnessLevel: vi.fn(),
        setSmallFiles: vi.fn(),
        setSelectedSmallFileKey: vi.fn(),
        setSmallFileReadText: vi.fn(),
        setBrowseEntries: vi.fn(),
        setRcspInfoText: vi.fn(),
        applyScreenInfo: vi.fn(),
        getConnection: vi.fn().mockReturnValue(connection),
        getSelectedSmallFile: vi.fn().mockReturnValue(null),
        getSmallFiles: vi.fn().mockReturnValue([]),
      }
    }

    it('sets status to "Not connected." when disconnected', async () => {
      const cb = createMockCallbacks(null)
      const ops = createDeviceOps(cb)

      await ops.refreshBattery()

      expect(cb.setStatus).toHaveBeenCalledWith('Not connected.')
      expect(cb.setBattery).not.toHaveBeenCalled()
    })

    it('executes operation successfully when connected', async () => {
      const conn = { server: { connected: true } }
      const cb = createMockCallbacks(conn)
      const ops = createDeviceOps(cb)

      await ops.refreshBattery()

      expect(cb.setBusy).toHaveBeenNthCalledWith(1, true)
      expect(cb.setBattery).toHaveBeenCalledWith(85, '12:00:00', false)
      expect(cb.setBusy).toHaveBeenLastCalledWith(false)
    })

    it('prevents concurrent operations using isExecuting lock', async () => {
      const conn = { server: { connected: true } }
      const cb = createMockCallbacks(conn)
      const ops = createDeviceOps(cb)

      // Start an operation and don't wait immediately
      const p1 = ops.refreshBattery()
      const p2 = ops.refreshBattery()

      await Promise.all([p1, p2])

      expect(cb.log).toHaveBeenCalledWith(expect.stringContaining('already in progress, skipping'))
    })
  })

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
