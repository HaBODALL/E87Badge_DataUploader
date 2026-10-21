import { describe, it, expect } from 'vitest'
import { parseE87Frame, buildE87Frame, decodePeripherals } from '../e87-protocol'

describe('e87-protocol', () => {
  describe('buildE87Frame', () => {
    it('constructs a valid byte array for a frame', () => {
      const body = new Uint8Array([0x12, 0x34])
      const frame = buildE87Frame(0xc0, 0x06, body)

      expect(frame[0]).toBe(0xfe)
      expect(frame[1]).toBe(0xdc)
      expect(frame[2]).toBe(0xba)
      expect(frame[3]).toBe(0xc0)
      expect(frame[4]).toBe(0x06)
      expect(frame[5]).toBe(0x00) // body length high
      expect(frame[6]).toBe(0x02) // body length low
      expect(frame[7]).toBe(0x12)
      expect(frame[8]).toBe(0x34)
      expect(frame[9]).toBe(0xef) // footer
    })

    it('round-trips correctly with parseE87Frame', () => {
      const body = new Uint8Array([0xaa, 0xbb, 0xcc])
      const frame = buildE87Frame(0x80, 0x1d, body)
      const parsed = parseE87Frame(frame)

      expect(parsed).not.toBeNull()
      expect(parsed?.flag).toBe(0x80)
      expect(parsed?.cmd).toBe(0x1d)
      expect(parsed?.length).toBe(3)
      expect(parsed?.body).toEqual(body)
    })
  })

  describe('decodePeripherals', () => {
    it('returns empty array when bitmask is 0', () => {
      expect(decodePeripherals(0)).toEqual([])
    })

    it('decodes bitmask into corresponding peripheral labels', () => {
      // Bit 0: Heart rate sensor, Bit 3: Step counter
      const mask = (1 << 0) | (1 << 3)
      expect(decodePeripherals(mask)).toEqual([
        'Heart rate sensor',
        'Step counter',
      ])
    })

    it('decodes all bits when mask is 0xff', () => {
      expect(decodePeripherals(0xff)).toEqual([
        'Heart rate sensor',
        'Blood oxygen (SpO2)',
        'Accelerometer',
        'Step counter',
        'Temperature sensor',
        'GPS',
        'Barometer',
        'Gyroscope',
      ])
    })
  })

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
