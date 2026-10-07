import { describe, it, expect } from 'vitest'
import { parseE87Frame } from '../e87-protocol'

describe('e87-protocol', () => {
  describe('parseE87Frame', () => {
    it('returns null if frame is too short', () => {
      expect(parseE87Frame(new Uint8Array(4))).toBeNull()
    })

    it('returns null if header is incorrect', () => {
      // Header should be [0xFE, 0xDC, 0xBA]
      const frame = new Uint8Array([0x5A, 0xAA, 0x00, 0x00, 0x00, 0x00, 0x00, 0xEF])
      expect(parseE87Frame(frame)).toBeNull()
    })

    it('returns null if footer is missing/incorrect', () => {
      // Footer should be 0xEF
      const frame = new Uint8Array([0xFE, 0xDC, 0xBA, 0x00, 0x00, 0x00, 0x00, 0xED])
      expect(parseE87Frame(frame)).toBeNull()
    })

    it('returns null if body length is incorrect', () => {
      // header(3) + flag(1) + cmd(1) + len(2) + body(2) + footer(1) = 10
      // Actual payload is 2 bytes, but header length claims 3 bytes
      const frame = new Uint8Array([0xFE, 0xDC, 0xBA, 0x01, 0x02, 0x00, 0x03, 0xFF, 0xFF, 0xEF])
      expect(parseE87Frame(frame)).toBeNull()
    })

    it('parses a valid frame correctly', () => {
      // header(3) + flag(1) + cmd(1) + len(2) + body(1) + footer(1) = 9
      const frame = new Uint8Array([0xFE, 0xDC, 0xBA, 0x01, 0x02, 0x00, 0x01, 0xFF, 0xEF])
      const parsed = parseE87Frame(frame)
      expect(parsed).not.toBeNull()
      expect(parsed?.flag).toBe(0x01)
      expect(parsed?.cmd).toBe(0x02)
      expect(parsed?.length).toBe(1)
      expect(parsed?.body).toEqual(new Uint8Array([0xFF]))
    })
  })
})
