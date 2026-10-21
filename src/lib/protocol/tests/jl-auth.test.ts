import { describe, it, expect } from 'vitest'
import { getRandomAuthData, getEncryptedAuthData } from '../jl-auth'

describe('jl-auth', () => {
  describe('getRandomAuthData', () => {
    it('returns a Uint8Array of length 16', () => {
      const data = getRandomAuthData()
      expect(data).toBeInstanceOf(Uint8Array)
      expect(data.length).toBe(16)
    })

    it('generates non-zero / random bytes', () => {
      const data1 = getRandomAuthData()
      const data2 = getRandomAuthData()
      expect(data1).not.toEqual(data2)
    })
  })

  describe('getEncryptedAuthData', () => {
    it('returns encrypted response Uint8Array of length 16', () => {
      const challenge = new Uint8Array(16)
      const response = getEncryptedAuthData(challenge)
      expect(response).toBeInstanceOf(Uint8Array)
      expect(response.length).toBe(16)
      expect(response[0]).toBe(0xff)
      expect(response[15]).toBe(0x79)
    })
  })
})
