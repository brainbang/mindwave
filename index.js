const EventEmitter = require('events').EventEmitter
const SerialPort = require('serialport')
const buffy = require('buffy')

// TODO: get rid of buffy (just use Buffer.readUIntBE(0, 3)), use more modern syntax
// TODO: should I use C++/rust/asmscript in wasm to do all the parsing? would be faster and more cross-target, then I could wrap other stuff (connect to bluetooth-serial) for each platform

const BT_SYNC = 0xAA
const CODE_EX = 0x55 // Extended code
const CODE_SIGNAL_QUALITY = 0x02 // POOR_SIGNAL quality 0-255
const CODE_HEART = 0x03 // HEART_RATE 0-255
const CODE_ATTENTION = 0x04 // ATTENTION eSense 0-100
const CODE_MEDITATION = 0x05 // MEDITATION eSense 0-100
const CODE_BLINK = 0x16 // BLINK strength 0-255
const CODE_WAVE = 0x80 // RAW wave value: 2-byte big-endian 2s-complement
const CODE_ASIC_EEG = 0x83 // ASIC EEG POWER 8 3-byte big-endian integers

class Mindwave extends EventEmitter {
  connect (port, baud = 57600) {
    if (baud !== 9600 && baud !== 57600) {
      return this.emit('error', 'Invalid baud. Set to 9600 or 57600')
    }
    this.baud = baud
    this.port = port

    // TODO: switch baud code if 57600 for higher res data
    // TODO: handle options to ignore differnt types of data
    // http://developer.neurosky.com/docs/doku.php?id=thinkgear_communications_protocol#thinkgear_command_bytes

    this.serialPort = new SerialPort(this.port, {
      baudRate: this.baud,
      autoOpen: false
    })

    this.serialPort.open(() => {
      this.emit('connect')
      this.serialPort.on('data', (data) => {
        this.emit(this.parse(data))
      })
    })
  }

  disconnect () {
    this.serialPort.pause()
    this.serialPort.flush(() => {
      this.serialPort.close(() => {
        this.emit('disconnect')
      })
    })
  }

  parse (data) {
    const reader = buffy.createReader(data)
    while (reader.bytesAhead() > 2) {
      if (reader.uint8() === BT_SYNC && reader.uint8() === BT_SYNC) {
        const len = reader.uint8()
        if (len > 170) { return }
        if (len === BT_SYNC) { break }
        const payload = reader.buffer(len)
        this.parsePacket(payload)
      }
    }
  }

  // TODO: use modern buffer techniques
  // TODO: add more
  // TODO: scale all values 0-100
  // http://developer.neurosky.com/docs/doku.php?id=thinkgear_communications_protocol#data_payload_structure
  parsePacket (data) {
    const reader = buffy.createReader(data)
    while (reader.bytesAhead() > 0) {
      switch (reader.uint8()) {
        case CODE_EX:
          this.emit('extended')
          break

        case CODE_HEART:
          this.emit('heart', reader.uint8())
          break

        case CODE_SIGNAL_QUALITY:
          this.emit('signal', reader.uint8())
          break

        case CODE_ATTENTION:
          this.emit('attention', reader.uint8())
          break

        case CODE_MEDITATION:
          this.emit('meditation', reader.uint8())
          break

        case CODE_BLINK:
          this.emit('blink', reader.uint8())
          break

        case CODE_WAVE:
          reader.skip(1)
          // -32768 to 32767
          this.emit('wave', reader.int16BE())
          break

        case CODE_ASIC_EEG:
          this.emit('eeg', this.parseEEG(reader.buffer(24)))
          break
      }
    }
  }

  // TODO: use modern buffer techniques
  parseEEG (data) {
    return {
      delta: this.parse3ByteInteger(data.slice(0, 2)),
      theta: this.parse3ByteInteger(data.slice(3, 5)),
      loAlpha: this.parse3ByteInteger(data.slice(6, 8)),
      hiAlpha: this.parse3ByteInteger(data.slice(9, 11)),
      loBeta: this.parse3ByteInteger(data.slice(12, 14)),
      hiBeta: this.parse3ByteInteger(data.slice(15, 17)),
      loGamma: this.parse3ByteInteger(data.slice(18, 20)),
      midGamma: this.parse3ByteInteger(data.slice(21, 24))
    }
  }

  // TODO: use modern buffer techniques
  parse3ByteInteger (data) {
    return (data[0] << 16) |
    (((1 << 16) - 1) & (data[1] << 8)) |
    ((1 << 8) - 1) &
    data[2]
  }
}

module.exports = Mindwave
