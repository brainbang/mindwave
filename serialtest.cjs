const emitonoff = require('emitonoff')
const SerialPort = require('@serialport/stream')
const Delimiter = require('@serialport/parser-delimiter')


SerialPort.Binding = require('@serialport/bindings')
const serialport = new SerialPort('/dev/rfcomm0', { baudRate: 57600 })

const SYNC = 0xAA
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


function checksum (payload) {
  let checksum = 0
  for (let i = 0; i < payload.length; i++) {
    checksum += payload[i]
  }
  checksum &= 0xFF
  checksum = ~checksum & 0xFF
  return checksum
}

class BufferThing {
  constructor(v) {
    this._buffer = Buffer.from(v)
  }


}

const e = emitonoff()
e.on('data', console.log)

// this should be just the payload part, without SYNC, SYNC, LEN, ..., CHK
// http://developer.neurosky.com/docs/doku.php?id=thinkgear_communications_protocol
function parsePayload(payloadIn) {
  const out = {}
  let payload = Buffer.from(payloadIn)
  while(payload.length > 0) {
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
        out[ names[cmd] ] = payload.readUInt8(1)
        payload = payload.slice(2)
    } else if (cmd === RAW_16BIT) {
        out[ names[cmd] ] = payload.readInt16BE(1)
        payload = payload.slice(3)
    } else if (cmd === EEG_POWER) {
        out[ names[cmd] ] = {
          delta: payload.readFloatBE(1),
          theta: payload.readFloatBE(5),
          lowAlpha: payload.readFloatBE(9),
          highAlpha: payload.readFloatBE(13),
          lowBeta: payload.readFloatBE(17),
          highBeta: payload.readFloatBE(21),
          lowGamma: payload.readFloatBE(25),
          midGamma: payload.readFloatBE(29)
        }
        payload = payload.slice(33)
    } else if (cmd === ASIC_EEG_POWER) {
        out[ names[cmd] ] = {
          delta: payload.readIntBE(1, 3),
          theta: payload.readIntBE(4, 3),
          lowAlpha: payload.readIntBE(7, 3),
          highAlpha: payload.readIntBE(10, 3),
          lowBeta: payload.readIntBE(13, 3),
          highBeta: payload.readIntBE(16, 3),
          lowGamma: payload.readIntBE(19, 3),
          midGamma: payload.readIntBE(22, 3)
        }
        payload = payload.slice(25)
    } else if (cmd === RRINTERVAL) {
        out[ names[cmd] ] = payload.readUInt16BE(1)
        payload = payload.slice(3)
    }
  }
  return out
}

serialport
  .pipe(new Delimiter({ delimiter: Buffer.from([SYNC, SYNC]) }))
  .on('data', data => {
    const len = data[0]
    let payload = data.slice(1, len + 1)
    const chk = data[len + 1]
    if (chk === checksum(payload)) {
      e.emit('data', parsePayload(payload))
    }
  })