# mindwave

A cross-platform driver for bluetooth Neurosky Mindwave headsets.

![screenshot of example](https://user-images.githubusercontent.com/83857/127944145-e530f147-7d35-4199-a1d8-049e6daf6b84.png)

There are 2 examples included, and if you'd like to see an example GUI project, check out [mindgraph](https://github.com/brainbang/mindgraph).


# WARNING

I created a C version (based on [docs](http://developer.neurosky.com/docs/doku.php?id=thinkgear_communications_protocol), compiled it to wasm & native, and compared the results between wasm & native, and js. Currently C implementation does not match my javascript:

```
Wasmer

real  0m0.328s
user  0m0.168s
sys 0m0.165s
136777 test/test_wasmer.txt

WASI (node)

real  0m0.134s
user  0m0.138s
sys 0m0.016s
136777 test/test_wasijs.txt

Native (C)

real  0m0.040s
user  0m0.034s
sys 0m0.010s
136777 test/test_c.txt

Plain JS

real  0m0.993s
user  0m0.857s
sys 0m0.207s
139937 test/test_js.txt
```

But I'll be working on fixing it, and update this once I get it squared away. If I can't figure it out, I may just need to parse in C (and use wasm.)


## usage

### hardware

This library uses lower-level serial-over-bluetooth to communicate. For it to work, you will need to pair with it. It should be noted, you can put the headset in pairing-mode by holding up the power until it double-blinks blue (before it turns red.) Solid-blue means you have a working bluetooth/serial connection.

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

At any time you can get the status:

```
service mindwave status
```


#### windows

I haven't tested as much here, but it should work with built-in windows stuff, setting up SPP (serial over bluetooth) and pairing. You can read more about the process [here](http://support.neurosky.com/kb/mindwave-mobile-2/cant-pair-mindwave-mobile-2-with-computer-or-mobile-device). In your device manager, under "Advanced" look for the COM port it sets up, and use that in your code. On mine, it was `COM4`.

#### mac

Install the [official mac driver](http://download.neurosky.com/public/Products/MindWave%20headset/RF%20driver%20for%20Mac/MindWaveDriver5.1.pkg). You can read more about it [here](http://support.neurosky.com/kb/mindwave/mindwave-cant-work-on-mac-osx-1011-or-higher). Your serial-device will be something like `/dev/tty.MindWaveMobile-DevA` or sometimes `/dev/cu.MindWaveMobile-DevA` works better (it seemed to have issues rapidly disconnecting and connecting, but changing devices would sometimes fix that.) Make sure to set this at the bottom of the examples, instead of `/dev/rfcomm0`. Put it in pairing-mode and pair with it, then start your program, and it should go solid-blue and start outputting data.


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
- More cross-platform testing, try to get around having to setup mac driver/rfcomm (maybe with node bluetooth serial lib & web bluetooth API)
- write comparison C function for parsing buffers, and compile for wasm. Do comparioson-tests on real traffic from device. I can verify my js code this way (using reference C implementation in docs) and it might improve performance for js (basically just hook native or web bluetooth API to parsing wasm.) Once I can verify they match, I could try another language I like more, like assmeblyscript or rust (and test them against the js.)
