// this is a very simple example

import { Mindwave } from '../index.js'
const mw = new Mindwave()

// normally I would do this in a loop, but explicit is good for demo-code

// mw.on('battery', (data) => {
//   console.log('battery', data)
// })
//
// mw.on('signal', (data) => {
//   console.log('signal', data)
// })
//
// mw.on('heartRate', (data) => {
//   console.log('heartRate', data)
// })
//
// mw.on('attention', (data) => {
//   console.log('attention', data)
// })
//
// mw.on('meditation', (data) => {
//   console.log('meditation', data)
// })
//
// mw.on('raw8 ', (data) => {
//   console.log('raw8 ', data)
// })
//
// mw.on('marker', (data) => {
//   console.log('marker', data)
// })
//
// mw.on('raw16', (data) => {
//   console.log('raw16', data)
// })
//
// mw.on('eeg ', (data) => {
//   console.log('eeg ', data)
// })
//
// mw.on('eegAsic ', (data) => {
//   console.log('eegAsic ', data)
// })
//
// mw.on('rInterval', (data) => {
//   console.log('rInterval', data)
// })

mw.on('data', console.log)

process.on('exit', () => {
  mw.disconnect()
})

// I am leaving off path, will try to let it guess, based on OS
mw.connect()
