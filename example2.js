// this is a fancier example that uses blessed to make a graph in the terminal

const Mindwave = require('./index.js')
const blessed = require('blessed')
const contrib = require('blessed-contrib')

const screen = blessed.screen()

const line = contrib.line({
  label: 'Mindwave',
  showLegend: true
})

// should basically match the GUI
const bands = {
  signal: [100, 100, 100],
  blink: [130, 130, 130],

  attention: [0, 255, 0],
  meditation: [255, 0, 0],
  delta: [127, 127, 0],
  theta: [127, 0, 0],
  loAlpha: [0, 127, 0],
  hiAlpha: [255, 255, 0],
  loBeta: [255, 127, 0],
  hiBeta: [127, 255, 0],
  loGamma: [0, 0, 127],
  midGamma: [255, 0, 127]
}

const size = 8
const fields = ['signal', 'blink', 'attention', 'meditation', 'delta', 'theta', 'loAlpha', 'hiAlpha', 'loBeta', 'hiBeta', 'loGamma', 'midGamma']
const data = fields.map(title => ({
  title,
  x: [...new Array(size)].map(() => '|'),
  y: [...new Array(size)].fill(0),
  style: { line: bands[title] }
}))

// set data from keyed-object
function setData (newData) {
  Object.keys(newData).forEach(field => {
    const i = fields.indexOf(field)
    data[i].y = [...data[i].y.slice(1), newData[field]]
  })
  line.setData(data)
  screen.render()
}

screen.append(line)
line.setData(data)

screen.key(['escape', 'q', 'C-c'], (ch, key) => {
  return process.exit(0)
})

screen.render()

const mw = new Mindwave()
mw.on('eeg', (eeg) => setData(eeg))
mw.on('signal', (signal) => setData({ signal }))
mw.on('blink', (blink) => setData({ blink }))
mw.on('attention', (attention) => setData({ attention }))
mw.on('meditation', (meditation) => setData({ meditation }))

// common device for mac
// mw.connect('/dev/tty.MindWaveMobile-DevA')

// linux
mw.connect('/dev/rfcomm0')
