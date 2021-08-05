/* global describe, test, expect */
import { Mindwave } from './index.js'
import { getScaledValue, toUInt24, toUInt16, toInt16, toFloat32 } from './math.js'

// this was the example in the docs
// since serial splits message up correctly, I just include the main packet
const testBuffer = Buffer.from([
  0x02, // [CODE] POOR_SIGNAL Quality
  0x20, // Some poor signal detected (32/255)
  0x01, // [CODE] BATTERY Level
  0x7E, // Almost full 3V of battery (126/127)
  0x04, // [CODE] ATTENTION eSense
  0x12, // eSense Attention level of 18%
  0x05, // [CODE] MEDITATION eSense
  0x60 // eSense Meditation level of 96%
])

describe('mindwave', () => {
  test('calculate checksum', () => {
    expect(Mindwave.checksum(testBuffer)).toBe(0xE3)
  })

  test('parse buffer from docs', () => {
    expect(Mindwave.parse(testBuffer)).toMatchSnapshot()
  })

  test('guess correct serial-port', async () => {
    expect(await Mindwave.getSerialPath('linux')).toBe('/dev/rfcomm0')
    expect(await Mindwave.getSerialPath('nooneeverheardof')).toBe('/dev/rfcomm0')
    expect(await Mindwave.getSerialPath('darwin')).toBe('/dev/tty.MindWaveMobile-DevA')
    expect(await Mindwave.getSerialPath('win32')).toBe('COM4')
  })
})

describe('math', () => {
  test('scale values correctly', () => {
    expect(getScaledValue(50, 0, 100)).toBe(50)
    expect(getScaledValue(50, 0, 200)).toBe(25)
    expect(getScaledValue(50, 100, 200)).toBe(-50)
    expect(getScaledValue(50, 0, 100, 100, 200)).toBe(150)
    expect(getScaledValue(50, 0, 100, 0, 300)).toBe(150)
    expect(getScaledValue(0, -100, 100)).toBe(50)
  })

  // I use node's buffer to test my implementations

  describe('toInt16', () => {
    test('should error on non-2 bytes', () => {
      expect(() => toInt16([0, 0, 0])).toThrow('Byte-length not divisible by 2.')
    })

    test('should handle 0,0', () => {
      const b = [0, 0]
      expect(toInt16(b)).toBe(Buffer.from(b).readInt16BE())
    })

    test('should handle 1,0', () => {
      const b = [1, 0]
      expect(toInt16(b)).toBe(Buffer.from(b).readInt16BE())
    })

    test('should handle 1,1', () => {
      const b = [1, 1]
      expect(toInt16(b)).toBe(Buffer.from(b).readInt16BE())
    })

    test('should handle 1,5', () => {
      const b = [1, 5]
      expect(toInt16(b)).toBe(Buffer.from(b).readInt16BE())
    })

    test('should handle 1,5,1,5', () => {
      const b = [1, 5, 1, 5]
      const r = toInt16(b)
      expect(r.length).toBe(2)
      expect(r[0]).toBe(Buffer.from(b).readInt16BE())
      expect(r[1]).toBe(Buffer.from(b).readInt16BE(2))
    })
  })

  describe('toUInt16', () => {
    test('should error on non-2 bytes', () => {
      expect(() => toUInt16([0, 0, 0])).toThrow('Byte-length not divisible by 2.')
    })

    test('should handle 0,0', () => {
      const b = [0, 0]
      expect(toUInt16(b)).toBe(Buffer.from(b).readUInt16BE())
    })

    test('should handle 1,0', () => {
      const b = [1, 0]
      expect(toUInt16(b)).toBe(Buffer.from(b).readUInt16BE())
    })

    test('should handle 1,1', () => {
      const b = [1, 1]
      expect(toUInt16(b)).toBe(Buffer.from(b).readUInt16BE())
    })

    test('should handle 1,5', () => {
      const b = [1, 5]
      expect(toUInt16(b)).toBe(Buffer.from(b).readUInt16BE())
    })

    test('should handle 1,5,1,5', () => {
      const b = [1, 5, 1, 5]
      const r = toUInt16(b)
      expect(r.length).toBe(2)
      expect(r[0]).toBe(Buffer.from(b).readUInt16BE())
      expect(r[1]).toBe(Buffer.from(b).readUInt16BE(2))
    })
  })

  describe('toUInt24', () => {
    test('should error on non-3 bytes', () => {
      expect(() => toUInt24([0])).toThrow('Byte-length not divisible by 3.')
    })

    test('should handle 0,0,0', () => {
      const b = [0, 0, 0]
      expect(toUInt24(b)).toBe(Buffer.from(b).readIntBE(0, 3))
    })

    test('should handle 1,1,1', () => {
      const b = [1, 1, 1]
      expect(toUInt24(b)).toBe(Buffer.from(b).readIntBE(0, 3))
    })

    test('should handle 1,5,1', () => {
      const b = [1, 5, 1]
      expect(toUInt24(b)).toBe(Buffer.from(b).readIntBE(0, 3))
    })

    test('should handle 5,5,7', () => {
      const b = [5, 5, 7]
      expect(toUInt24(b)).toBe(Buffer.from(b).readIntBE(0, 3))
    })

    test('should handle 5,5,7,5,5,0', () => {
      const b = [5, 5, 7, 5, 5, 0]
      const r = toUInt24(b)
      expect(r.length).toBe(2)
      expect(r[0]).toBe(Buffer.from(b).readIntBE(0, 3))
      expect(r[1]).toBe(Buffer.from(b).readIntBE(3, 3))
    })
  })

  describe('toFloat32', () => {
    test('should error on non-4 bytes', () => {
      expect(() => toFloat32([0])).toThrow('Byte-length not divisible by 4.')
    })

    test('should handle 0,0,0,0', () => {
      const b = [0, 0, 0, 0]
      expect(toFloat32(b)).toBe(Buffer.from(b).readFloatBE())
    })

    test('should handle 1,1,1,1', () => {
      const b = [1, 1, 1, 1]
      expect(toFloat32(b)).toBe(Buffer.from(b).readFloatBE())
    })

    test('should handle 5,1,0,1', () => {
      const b = [5, 1, 0, 1]
      expect(toFloat32(b)).toBe(Buffer.from(b).readFloatBE())
    })

    test('should handle 5,1,0,1,6,5,3,2', () => {
      const b = [5, 1, 0, 1, 6, 5, 3, 2]
      const r = toFloat32(b)
      expect(r.length).toBe(2)
      expect(r[0]).toBe(Buffer.from(b).readFloatBE())
      expect(r[1]).toBe(Buffer.from(b).readFloatBE(4))
    })
  })
})
