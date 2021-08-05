// This is a class that represents several ways to connect to a Mindwave bluetooth headset

import emitonoff from 'emitonoff'

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

// simple utility to scale a value to a range
export function getScaledValue (value, sourceRangeMin, sourceRangeMax, targetRangeMin = 0, targetRangeMax = 100) {
  const targetRange = targetRangeMax - targetRangeMin
  const sourceRange = sourceRangeMax - sourceRangeMin
  return (value - sourceRangeMin) * targetRange / sourceRange + targetRangeMin
}

// stupid, almost completely minimal unsigned integer 3-byte array, stored as Uint32Array
export class UInt24Array {
  static parse (data) {
    return (
      (data[0] << 16) |
      (((1 << 16) - 1) & (data[1] << 8)) |
      ((1 << 8) - 1) &
      data[2]
    )
  }

  static from (a) {
    const out = new Uint32Array(a.length / 3)
    let ai = 0
    for (let i = 0; i < a.length; a += 3) {
      out[ai] = UInt24Array.parse(a.slice(i, i + 3))
      ai++
    }
    return out
  }
}

export class Mindwave {
  constructor (path, quiet = false) {
    emitonoff(this)
    this.on('error', msg => {
      if (!quiet) {
        console.error('Error', msg)
      }
    })

    this.on('warning', msg => {
      if (!quiet) {
        console.warn('Warning', msg)
      }
    })

    if (path) {
      this.connect(path)
    }
  }

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

  // try to guess the correct serial-port, based on platform
  static async getSerialPath (platform) {
    let path

    if (platform === 'darwin') {
      path = '/dev/tty.MindWaveMobile-DevA'
    } else if (platform === 'win32') {
      // TODO: need a better guess for windows port
      path = 'COM4'
    } else {
      path = '/dev/rfcomm0'
    }

    return path
  }

  // turn a valid buffer of commands into an object
  // this discards everything outside of the packet
  static parse (buffer) {
    // find message-boundries
    let msg
    let check
    let length
    for (let i = 0; i < buffer.length; i++) {
      if (buffer[i] === SYNC && buffer[i + 1] === SYNC) {
        length = buffer[i + 2]
        msg = buffer.slice(i + 3, i + 3 + length)
        check = buffer[i + 3 + length]
        break
      }
    }

    // make sure it checksums
    if (!msg || check !== Mindwave.checksum(msg)) {
      return { length: 0 }
    }

    const out = { length }
    while (msg.length) {
      // interim buffer for calculating bytes
      let b
      if (msg[0] === RAW_16BIT) {
        b = Int32Array.from(msg.slice(1, 2))
      }

      if (msg[0] === EEG_POWER) {
        b = Float32Array.from(msg.slice(1, 32))
      }

      if (msg[0] === ASIC_EEG_POWER) {
        b = UInt24Array.from(msg.slice(1, 24))
      }

      if (msg[0] === RRINTERVAL) {
        b = Uint16Array.from(msg.slice(1, 2))
      }

      switch (msg[0]) {
        case BATTERY_LEVEL:
          out.battery = getScaledValue(msg[1], 0, 127)
          msg = msg.slice(1)
          break

        case SIGNAL_LEVEL:
          out.signal = getScaledValue(msg[1], 0, 255)
          msg = msg.slice(1)
          break

        case HEART_RATE:
          out.heartRate = getScaledValue(msg[1], 0, 255)
          msg = msg.slice(1)
          break

        case ATTENTION:
          out.attention = msg[1]
          msg = msg.slice(1)
          break

        case MEDITATION:
          out.meditation = msg[1]
          msg = msg.slice(1)
          break

        case RAW_8BIT:
          out.raw8 = getScaledValue(msg[1], 0, 255)
          msg = msg.slice(1)
          break

        case RAW_MARKER:
          out.marker = msg[1] // should just be 0
          msg = msg.slice(1)
          break

        case RAW_16BIT:
          out.raw16 = getScaledValue(b[0], -32768, 32767)
          msg = msg.slice(2)
          break

        case EEG_POWER:
          // TODO: figure out better bounds for these values
          out.eeg = {
            delta: getScaledValue(b[0], -100000, 100000),
            theta: getScaledValue(b[1], -100000, 100000),
            lowAlpha: getScaledValue(b[2], -100000, 100000),
            highAlpha: getScaledValue(b[3], -100000, 100000),
            lowBeta: getScaledValue(b[4], -100000, 100000),
            highBeta: getScaledValue(b[5], -100000, 100000),
            lowGamma: getScaledValue(b[6], -100000, 100000),
            midGamma: getScaledValue(b[7], -100000, 100000)
          }
          msg = msg.slice(32)
          break

        case ASIC_EEG_POWER:
          // TODO: figure out better bounds for these values
          out.eeg_asic = {
            delta: getScaledValue(b[0], 0, 100000),
            theta: getScaledValue(b[1], 0, 100000),
            lowAlpha: getScaledValue(b[2], 0, 100000),
            highAlpha: getScaledValue(b[3], 0, 100000),
            lowBeta: getScaledValue(b[4], 0, 100000),
            highBeta: getScaledValue(b[5], 0, 100000),
            lowGamma: getScaledValue(b[6], 0, 100000),
            midGamma: getScaledValue(b[7], 0, 100000)
          }
          msg = msg.slice(24)
          break

        case RRINTERVAL:
          out.rInterval = getScaledValue(b[0], 0, 65535)
          msg = msg.slice(2)
          break

        default:
          // I dunno what this is, just chop a byte off to keep it rolling
          msg = msg.slice(1)
      }
    }
    return out
  }

  // use web Bluetooth API, pops up dialog, user chooses, connect stream of serial bytes to parser
  async connectBtWeb () {
    if (typeof navigator === 'undefined' || typeof navigator.bluetooth === 'undefined') {
      return this.emit('error', 'Your browser does not support bluetooth.')
    }
    // TODO
  }

  // use native bluetooth, connect stream of serial bytes to parser, mac is optional (otherwise, guess from list)
  async connectBt (mac) {
    // TODO
  }

  // use serialport API, connect stream of serial bytes to parser, path is optional and guessed based on OS if not provided
  async connectSerial (port, baud = 9600) {
    this.baud = baud

    if (baud !== 9600 && baud !== 57600) {
      return this.emit('error', 'Invalid baud. Set to 9600 or 57600')
    }

    if (!port) {
      port = await Mindwave.getSerialPath(process.platform)
      this.emit('warning', `Path not set, guessing ${port} based on OS.`)
    }

    this.port = port

    const SerialPort = (await import('serialport')).default
    this.serialPort = new SerialPort(port, {
      baudRate: this.baud,
      autoOpen: false
    })

    this.serialPort.open(() => {
      this.emit('connect')
      this.serialPort.on('data', (data) => {
        const { length, ...msg } = Mindwave.parse(data)
        this.emit('data', msg)
        Object.keys(msg).forEach(k => {
          this.emit(k, msg[k])
        })
      })
    })
  }

  disconnectSerial () {
    this.serialPort.pause()
    this.serialPort.flush(() => {
      this.serialPort.close(() => {
        this.emit('disconnect')
      })
    })
  }

  // guess connection-type based on path, connect stream of serial bytes to parser
  // MAC address = native bluetooth
  // COM or /dev/X is native serial path
  // no path triggers browser or serial (which guesses based on OS)
  connect (path = '') {
    if (path.includes(':')) {
      return this.connectBt(path)
    }

    if (path.startsWith('/dev') || path.startsWith('COM')) {
      return this.connectSerial(path)
    }

    if (!path || path === '') {
      if (typeof process === 'undefined' || typeof process?.versions?.electron !== 'undefined') {
        return this.connectBtWeb()
      } else {
        return this.connectSerial()
      }
    }

    return this.emit('error', 'Unknown path-type.')
  }
}
