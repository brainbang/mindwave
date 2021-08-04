// here I am playing with new parsing ideas

const BATTERY_LEVEL = 0x01 // battery-level 0-127
const SIGNAL_LEVEL = 0x02 // 1: Quality (0-255)
const HEART_RATE = 0x03 // 1: Once/s on EGO. (0-255)
const ATTENTION = 0x04 // 1: eSense (0-100)
const MEDITATION = 0x05 // 1: eSense (0 to 100)
const RAW_8BIT = 0x06 // 1: Wave Value (0-255)
const RAW_MARKER = 0x07 // 1: Section Start (0)
const RAW_16BIT = 0x80 // 2: a single big-endian 16-bit two's-compliment signed value (high-order byte followed by low-order byte) (-32768 to 32767)
const EEG_POWER = 0x81 // 32:  8 big-endian 4-byte IEEE 754 floating point values representing delta, theta, low-alpha, high-alpha, low-beta, high-beta, low-gamma, and mid-gamma EEG band power values
const ASIC_EEG_POWER = 0x83 // 24: 8 big-endian 3-byte unsigned integer values representing delta, theta, low-alpha, high-alpha, low-beta, high-beta, low-gamma, and mid-gamma EEG band power values
const RRINTERVAL = 0x86 // 2: big-endian unsigned integer representing the milliseconds between two R-peaks

const EXCODE = 0x55
const SYNC = 0xAA

// simple
function getScaledValue (value, sourceRangeMin, sourceRangeMax, targetRangeMin = 0, targetRangeMax = 100) {
  const targetRange = targetRangeMax - targetRangeMin
  const sourceRange = sourceRangeMax - sourceRangeMin
  return (value - sourceRangeMin) * targetRange / sourceRange + targetRangeMin
}

class Mindwave {
  // perform 1's comp inverse of 8-bit Payload sum
  static checksum (payload) {
    let checksum = 0
    for (let i = 0; i < payload.length; i++) {
      checksum += payload[i]
    }
    checksum &= 0xFF
    checksum = ~checksum & 0xFF
    return checksum
  }

  // turn a valid buffer of commands into an object
  static parse (buffer) {
    // find message-boundries
    let msg
    let check
    for (let i = 0; i < buffer.length; i++) {
      if (buffer[i] === SYNC && buffer[i + 1] === SYNC) {
        const length = buffer[i + 2]
        msg = buffer.slice(i + 3, i + 3 + length)
        check = buffer[i + 3 + length]
        break
      }
    }

    // make sure it checksums
    if (!msg || check !== Mindwave.checksum(msg)) {
      return {}
    }

    const out = {}
    while (msg.length) {
      switch (msg[0]) {
        case BATTERY_LEVEL:
          out.battery = getScaledValue(msg[1], 0, 127)
          msg = msg.slice(1)
          break
        // TODO: add more!
      }
    }
    return out
  }

  // use web Bluetooth API, connect stream of serial bytes to parser
  connectBtWeb () {}

  // use native bluetooth, connect stream of serial bytes to parser, mac is optional (otherwise, guess from list)
  connectBt (mac) {}

  // use serialport API, connect stream of serial bytes to parser, path is optional and guessed based on OS
  connectSerial (path) {}
}

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

console.log(Mindwave.parse(testBuffer))
