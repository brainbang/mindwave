# mindwave

A cross-platform driver for bluetooth Neurosky Mindwave headsets.

If you'd like to see an example project, check out [mindgraph](https://github.com/brainbang/mindgraph).

## usage

### hardware

This library uses lower-level serial-over-bluetooth to communicate. For it to work, you will need to pair with it. 

#### linux

- Install [gort](https://gort.io/documentation/getting_started/downloads/)
- Put headset in "pairing mode" (hold power up until it double-flashes, but before it turns red)
- Run `gort scan bluetooth` to get mac-address of "MindWave Mobile". Mine was `20:68:9D:4C:0E:93`, but yours might be different
- Run `sudo gort bluetooth serial 20:68:9D:4C:0E:93` (with your address) to connect headset to a virtual serial port. In my case, it connected to `/dev/rfcomm0`
- any code that uses this needs root-permissions. I will work on some udev rules to fix this, as soon as I figure it out 

#### windows

> TODO

#### mac

> TODO


### code


```js
var Mindwave = require('mindwave')
var mw = new Mindwave()

mw.on('eeg', (eeg) => {
  console.log('eeg', eeg)
});

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
```

## TODO

- Currently, only 9600 baud is supported, but eventually I will add support for high-resolution data (57600.)
- I have only tested on mac, and will need to add COM-port detection stuff for everyone, eventually.
- I need to add enable/disable stuff so you can ignore certain types of signals (for speed)
- [more opcodes](http://developer.neurosky.com/docs/doku.php?id=thinkgear_communications_protocol#data_payload_structure)
- seperate packet-parsing code. It might be possible to use bluetooth web apis.
