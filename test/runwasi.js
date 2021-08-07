// this will run parse.wasm (c compiled to wasi)
// cat test/log.bin | node --no-warnings --experimental-wasi-unstable-preview1 test/runwasi.js

import fs from 'fs'
import { WASI } from 'wasi'

const wasi = new WASI({
  args: process.argv
})

const wasm = await WebAssembly.compile(fs.readFileSync('./test/parse.wasm'));
const instance = await WebAssembly.instantiate(wasm, { wasi_unstable: wasi.wasiImport })
wasi.start(instance);