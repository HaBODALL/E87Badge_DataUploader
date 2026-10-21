import { describe, it, expect, vi } from 'vitest'
import { formatBytes, hexToBytes, sleep, toHex } from '../utils'

describe('utils', () => {
  describe('sleep', () => {
    it('resolves after the specified duration', async () => {
      vi.useFakeTimers()
      let done = false
      const promise = sleep(1000).then(() => {
        done = true
      })

      expect(done).toBe(false)
      vi.advanceTimersByTime(500)
      expect(done).toBe(false)

      vi.advanceTimersByTime(500)
      await promise
      expect(done).toBe(true)

      vi.useRealTimers()
    })
  })

  describe('formatBytes', () => {
    it('formats bytes correctly', () => {
      expect(formatBytes(0)).toBe('0 B')
      expect(formatBytes(1023)).toBe('1023 B')
    })

    it('formats kilobytes correctly', () => {
      expect(formatBytes(1024)).toBe('1.0 KB')
      expect(formatBytes(1536)).toBe('1.5 KB')
      expect(formatBytes(1024 * 1024 - 1)).toBe('1024.0 KB')
    })

    it('formats megabytes correctly', () => {
      expect(formatBytes(1024 * 1024)).toBe('1.00 MB')
      expect(formatBytes(1024 * 1024 * 2.5)).toBe('2.50 MB')
    })
  })

  describe('hexToBytes', () => {
    it('throws error on invalid length', () => {
      expect(() => hexToBytes('123')).toThrow('Invalid hex string length: 123')
    })

    it('converts hex to bytes correctly', () => {
      expect(toHex(hexToBytes('01020a0f'))).toBe('01020a0f')
    })
  })
})
