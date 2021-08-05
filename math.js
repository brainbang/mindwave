import ieee754 from 'ieee754'

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
