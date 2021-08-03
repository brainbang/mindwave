# mindwave

A cross-platform driver for bluetooth Neurosky Mindwave headsets.

![screenshot of example](https://user-images.githubusercontent.com/83857/127944145-e530f147-7d35-4199-a1d8-049e6daf6b84.png)

There are 2 examples included, and if you'd like to see an example GUI project, check out [mindgraph](https://github.com/brainbang/mindgraph).

## usage

### hardware

This library uses lower-level serial-over-bluetooth to communicate. For it to work, you will need to pair with it. It should be noted, you can put the headset in pairing-mode by holding up the power until it double-blinks blue (before it turns red.) Solid-blue means you have a bluetooth/serial connection.

#### linux

Here is what I did:

- Install [gort](https://gort.io/documentation/getting_started/downloads/)
- Put headset in "pairing mode" (hold power up until it double-flashes, but before it turns red)
- Run `sudo gort scan bluetooth` to get mac-address of "MindWave Mobile". Mine was `20:68:9D:4C:0E:93`, but yours might be different
- Run `sudo gort bluetooth serial 20:68:9D:4C:0E:93` (with your address) to connect headset to a virtual serial port. In my case, it connected to `/dev/rfcomm0`
- make sure your user is in `dialout` or whatever group owns that device. `sudo adduser konsumer dialout` did that for me (requires re-login.)
- verify your connection with `node example1.js` (or `example2.js` for a nice graph.)

**automation**

I recommend you setup your system to automate the connection, which will alleviate connection headaches, and make it mostly just work whenever it's turned on. You can automate the connection on a systemd-based OS (debian, ubuntu, raspbian, etc) by editing `/etc/systemd/system/mindwave.service`:

```
[Unit]
Description=Mindwave service
After=bluetooth.service
Requires=bluetooth.service
 
[Service]
ExecStart=/usr/bin/gort bluetooth serial 20:68:9D:4C:0E:93
Restart=always
RestartSec=5s
 
[Install]
WantedBy=multi-user.target
```

Now run this:

```
sudo systemctl daemon-reload
sudo systemctl enable mindwave
sudo systemctl start mindwave
```

Make sure to change `20:68:9D:4C:0E:93` to whatever you discovered in `gort scan bluetooth`. After all this, it should work anytime the mindwave is turned on (even outside of pairing-mode.) It is contantly restarting gort (every 5s) if it doesn't find the headset, but it has pretty low overhead.

Any time you can get the status:

```
service mindwave status
```


#### windows

> TODO: I need to test, but it should work with the [official software](http://developer.neurosky.com/docs/doku.php?id=thinkgear_connector_tgc).

#### mac

The easiest way is to install the [official software](http://developer.neurosky.com/docs/doku.php?id=thinkgear_connector_tgc). Get it all working normally, and your serial-device will be something like `/dev/cu.MindWaveMobile-DevA`. Make sure to set this at the bottom of the examples, instead of `/dev/rfcomm0`.


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
- More cross-platform testing, try to get around having to setup rfcomm/thinkgear/etc (maybe with node bluetooth connection lib)
- wrap `connect` function for [web bluetooth](https://developer.mozilla.org/en-US/docs/Web/API/Web_Bluetooth_API) and make it load serialport on-demand (will help with electron/etc packaging too, since it can use webapi) make an example "offline web app" for mobile, and a [neutrolino](https://github.com/neutralinojs/neutralinojs) or electron app for desktop
- modern syntax (use `Buffer` and get rid of buffy)
- pre-scale values so they work better together in a graph. maybe float:0.0 - 100.0?
- write comparison C function for parsing buffers, and compile for wasm. DO comparioson-tests on real traffic from device. I can verify my js code this way (using reference C implementation in docs) and it might improve performance for js (basically just hook native or web bluetooth API to parsing wasm.)
