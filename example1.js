// this is a very simple example

const Mindwave = require('./index.js')
const mw = new Mindwave()

mw.on('eeg', (eeg) => {
  console.log('eeg', eeg)
})

mw.on('signal', (signal) => {
  console.log('signal', signal)
})

mw.on('attention', (attention) => {
  console.log('attention', attention)
})

mw.on('meditation', (meditation) => {
  console.log('meditation', meditation)
})

mw.on('blink', (blink) => {
  console.log('blink', blink)
})

// These are the raw EEG data
// They come in at about 512Hz
// mw.on('wave', (wave) => {
//  console.log('wave', wave)
// })

// common device for mac
// mw.connect('/dev/cu.MindWaveMobile-DevA')

// linux
mw.connect('/dev/rfcomm0')
