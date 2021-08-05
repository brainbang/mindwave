// This is a class that represents several ways to connect to a Mindwave bluetooth headset

import emitonoff from 'emitonoff'
import ieee754 from 'ieee754'

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

const SYNC = 0xAA

const names = {
  [BATTERY_LEVEL]: 'battery',
  [SIGNAL_LEVEL]: 'signal',
  [HEART_RATE]: 'heartRate',
  [ATTENTION]: 'attention',
  [MEDITATION]: 'meditation',
  [RAW_8BIT]: 'raw8',
  [RAW_MARKER]: 'marker',
  [RAW_16BIT]: 'raw16',
  [EEG_POWER]: 'eeg',
  [ASIC_EEG_POWER]: 'eegAsic',
  [RRINTERVAL]: 'interval'
}

// simple utility to scale a value to a range
export function getScaledValue (value, sourceRangeMin, sourceRangeMax, targetRangeMin = 0, targetRangeMax = 100) {
  const targetRange = targetRangeMax - targetRangeMin
  const sourceRange = sourceRangeMax - sourceRangeMin
  return (value - sourceRangeMin) * targetRange / sourceRange + targetRangeMin
}

// These do byte-operations without Buffer (for browser)
// lots of ideas from https://github.com/feross/buffer
export function toInt16 (buffer) {
  if ((buffer.length % 2) !== 0) {
    throw new Error('Byte-length not divisible by 2.')
  }
  const out = (new Int16Array(buffer.length / 2)).map((v, i) => {
    const n = i * 2
    const val = buffer[n + 1] | (buffer[n] << 8)
    return (val & 0x8000) ? val | 0xFFFF0000 : val
  })
  return out.length === 1 ? out[0] : out
}

export function toUInt16 (buffer) {
  if ((buffer.length % 2) !== 0) {
    throw new Error('Byte-length not divisible by 2.')
  }
  const out = (new Uint16Array(buffer.length / 2)).map((v, i) => {
    const n = i * 2
    return (buffer[n] << 8) | buffer[n + 1]
  })
  return out.length === 1 ? out[0] : out
}

export function toUInt24 (buffer) {
  if ((buffer.length % 3) !== 0) {
    throw new Error('Byte-length not divisible by 3.')
  }
  const out = (new Uint32Array(buffer.length / 3)).map((v, i) => {
    const n = i * 3
    let byteLength = 3
    let val = buffer[n + --byteLength]
    let mul = 1
    while (byteLength > 0 && (mul *= 0x100)) {
      val += buffer[n + --byteLength] * mul
    }
    return val
  })
  return out.length === 1 ? out[0] : out
}

export function toFloat32 (buffer) {
  if ((buffer.length % 4) !== 0) {
    throw new Error('Byte-length not divisible by 4.')
  }
  const out = (new Float32Array(buffer.length / 4)).map((v, i) => {
    const n = i * 4
    return ieee754.read(buffer, n, false, 23, 4)
  })
  return out.length === 1 ? out[0] : out
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
      // TODO: really need a better guess for windows port
      path = 'COM4'
    } else {
      path = '/dev/rfcomm0'
    }

    return path
  }

  // turn a valid buffer of commands into an object
  // this discards everything outside of the packet
  static parse (payload, normalize = true) {
    const out = {}
    while (payload.length > 0) {
      const cmd = payload[0]
      if (
        cmd === BATTERY_LEVEL ||
      cmd === SIGNAL_LEVEL ||
      cmd === HEART_RATE ||
      cmd === ATTENTION ||
      cmd === MEDITATION ||
      cmd === RAW_8BIT ||
      cmd === RAW_MARKER
      ) {
        out[names[cmd]] = payload[1]
        payload = payload.slice(2)
      } else if (cmd === RAW_16BIT) {
        out[names[cmd]] = toInt16(payload.slice(1, 3))
        payload = payload.slice(3)
      } else if (cmd === EEG_POWER) {
        const data = toFloat32(payload.slice(1, 33))
        out[names[cmd]] = {
          delta: data[0],
          theta: data[1],
          lowAlpha: data[2],
          highAlpha: data[3],
          lowBeta: data[4],
          highBeta: data[5],
          lowGamma: data[6],
          midGamma: data[7]
        }
        payload = payload.slice(33)
      } else if (cmd === ASIC_EEG_POWER) {
        const data = toUInt24(payload.slice(1, 25))
        out[names[cmd]] = {
          delta: data[0],
          theta: data[1],
          lowAlpha: data[2],
          highAlpha: data[3],
          lowBeta: data[4],
          highBeta: data[5],
          lowGamma: data[6],
          midGamma: data[7]
        }
        payload = payload.slice(25)
      } else if (cmd === RRINTERVAL) {
        out[names[cmd]] = toUInt16(payload.slice(1, 3))
        payload = payload.slice(3)
      }
    }
    if (normalize) {
      Object.keys(out).forEach(k => {
        if (k === names[BATTERY_LEVEL]) {
          out[k] = getScaledValue(out[k], 0, 127)
        } else if (k === names[SIGNAL_LEVEL]) {
          out[k] = getScaledValue(out[k], 0, 255)
        } else if (k === names[HEART_RATE]) {
          out[k] = getScaledValue(out[k], 0, 255)
        } else if (k === names[RAW_8BIT]) {
          out[k] = getScaledValue(out[k], 0, 255)
        } else if (k === names[RAW_16BIT]) {
          out[k] = getScaledValue(out[k], -32768, 32767)
        }
      // TODO: range for eeg values?
      })
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
  async connectSerial (port, baudRate = 57600) {
    this.baudRate = baudRate

    if (baudRate !== 9600 && baudRate !== 57600) {
      return this.emit('error', 'Invalid baud. Set to 9600 or 57600')
    }

    if (!port) {
      port = await Mindwave.getSerialPath(process.platform)
      this.emit('warning', `Path not set, guessing ${port} based on OS.`)
    }

    this.port = port

    const SerialPort = (await import('@serialport/stream')).default
    SerialPort.Binding = (await import('@serialport/bindings')).default

    const Delimiter = (await import('@serialport/parser-delimiter')).default
    this.serialPort = new SerialPort(port, { baudRate })
    // Delimite packets on SYNC+SYNC and feed to parser
    // then trigger data message (for packet object) and individual messages
    this.serialPort
      .pipe(new Delimiter({ delimiter: Buffer.from([SYNC, SYNC]) }))
      .on('data', data => {
        const len = data[0]
        const payload = data.slice(1, len + 1)
        const chk = data[len + 1]
        if (chk === Mindwave.checksum(payload)) {
          const data = Mindwave.parse(payload)
          this.emit('data', data)
          Object.keys(data).forEach(k => {
            this.emit(k, data[k])
          })
        }
      })
  }

  // guess connection-type based on path, connect stream of serial bytes to parser
  connect (path = '') {
    // MAC address = native bluetooth
    if (path.includes(':')) {
      return this.connectBt(path)
    }

    // COM or /dev/X is native serial path
    if (path.startsWith('/dev') || path.startsWith('COM')) {
      return this.connectSerial(path)
    }

    // no path triggers browser or serial (guessed based on OS)
    if (!path || path === '') {
      if (typeof process === 'undefined' || typeof process?.versions?.electron !== 'undefined') {
        return this.connectBtWeb()
      } else {
        return this.connectSerial()
      }
    }

    return this.emit('error', 'Unknown path-type.')
  }

  disconnect () {
    if (this.serialPort) {
      return new Promise((resolve, reject) => {
        this.serialPort.pause()
        this.serialPort.flush(() => {
          this.serialPort.close(() => {
            this.emit('disconnect')
            this.resolve(true)
          })
        })
      })
    }
  }
}
