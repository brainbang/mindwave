# mindwave

A cross-platform driver for bluetooth Neurosky Mindwave headsets.

![screenshot of example](https://user-images.githubusercontent.com/83857/127944145-e530f147-7d35-4199-a1d8-049e6daf6b84.png)

There are 2 examples included, and if you'd like to see an example GUI project, check out [mindgraph](https://github.com/brainbang/mindgraph).

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

// untested, but I think it's like this on windows:
// mw.connect('COM4')

// linux
mw.connect('/dev/rfcomm0')
```

## TODO

- Currently, only 9600 baud is supported, but eventually I will add support for high-resolution data (57600.)
- [more opcodes](http://developer.neurosky.com/docs/doku.php?id=thinkgear_communications_protocol#data_payload_structure)
- More cross-platform testing, try to get around having to setup rfcomm/thinkgear/etc
- wrap `connect` function for [web bluetooth](https://developer.mozilla.org/en-US/docs/Web/API/Web_Bluetooth_API) and make it load serialport on-demand (will help with electron/etc packaging too, sicne it can use webapi)
- modern syntax (use `Buffer` and get rid of buffy)
- pre-scale values so they work better together in a graph. maybe float:0.0 - 100.0?