import { Mindwave, getScaledValue, UInt24Array } from './index.js'

// this was the example in the docs
const testBuffer = Buffer.from([
  0x01, // junk
  0x02, // junk
  0x03, // junk
  0xAA, // [SYNC]
  0xAA, // [SYNC]
  0x08, // [PLENGTH] (payload length) of 8 bytes

  0x02, // [CODE] POOR_SIGNAL Quality
  0x20, // Some poor signal detected (32/255)
  0x01, // [CODE] BATTERY Level
  0x7E, // Almost full 3V of battery (126/127)
  0x04, // [CODE] ATTENTION eSense
  0x12, // eSense Attention level of 18%
  0x05, // [CODE] MEDITATION eSense
  0x60, // eSense Meditation level of 96%

  0xE3, // [CHKSUM] (1's comp inverse of 8-bit Payload sum of 0x1C)
  0x01, // junk
  0x02, // junk
  0x03 // junk
])

test('parse buffer from docs', () => {
  expect(Mindwave.parse(testBuffer)).toMatchSnapshot()
})

test('guess correct serial-port', async () => {
  expect(await Mindwave.getSerialPath('linux')).toBe('/dev/rfcomm0')
  expect(await Mindwave.getSerialPath('nooneeverheardof')).toBe('/dev/rfcomm0')
  expect(await Mindwave.getSerialPath('darwin')).toBe('/dev/tty.MindWaveMobile-DevA')
  expect(await Mindwave.getSerialPath('win32')).toBe('COM4')
})

test('scale values correctly', () => {
  expect(getScaledValue(50, 0, 100)).toBe(50)
  expect(getScaledValue(50, 0, 200)).toBe(25)
  expect(getScaledValue(50, 100, 200)).toBe(-50)
  expect(getScaledValue(50, 0, 100, 100, 200)).toBe(150)
  expect(getScaledValue(50, 0, 100, 0, 300)).toBe(150)
})
