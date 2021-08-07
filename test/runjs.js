// this is meant to match the output of runwasi.js
// cat test/log.bin | node test/runjs.js

const SYNC = 0xAA
const EXCODE = 0x55
const RAW_16BIT = 0x80

function parsePayload (payload) {
  let bytesParsed = 0
  let code
  let length
  let extendedCodeLevel
  while (bytesParsed < payload.length) {
    extendedCodeLevel = 0
    while (payload[bytesParsed] == EXCODE) {
      extendedCodeLevel++
      bytesParsed++
    }

    code = payload[bytesParsed++]

    if (code === RAW_16BIT) {
      length = payload[bytesParsed++]
    } else {
      length = 1
    }

    let dataString = ''
    for (let i = 0; i < length; i++) {
      dataString += ' ' + (payload[bytesParsed + i] & 0xFF).toString(16).padStart(2, '0').toUpperCase()
    }
    console.log(`CODE: 0x${code.toString(16).padStart(2, '0').toUpperCase()} EXCODE: ${extendedCodeLevel} DATA: ${dataString}`)

    bytesParsed += length
  }
}

function getChecksum (payload) {
  let checksum = 0
  for (let i = 0; i < payload.length; i++) {
    checksum += payload[i]
  }
  checksum &= 0xFF
  checksum = ~checksum & 0xFF
  return checksum
}

process.stdin.on('data', data => {
  let buffer = Buffer.from(data)

  // take len number of bytes off front, starting at start
  function getBytes (len = 1, start = 0) {
    const d = buffer.slice(start, start + len)
    buffer = buffer.slice(start + len)
    return d.length === 1 ? d[0] : d
  }

  for (const i in buffer) {
    const s1 = getBytes()
    const s2 = getBytes()
    if (s1 === SYNC && s2 === SYNC) {
      const pLength = getBytes()
      const payload = getBytes(pLength)
      const c = getBytes()

      if (pLength > 169) {
        continue
      }

      if (c !== getChecksum(payload)) {
        continue
      }
      parsePayload(payload)
    }
  }
})
