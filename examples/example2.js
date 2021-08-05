// this is a fancier example that uses blessed to make a graph in the terminal

import { Mindwave } from '../index.js'
import blessed from 'blessed'
import contrib from 'blessed-contrib'

const screen = blessed.screen()

const line = contrib.line({
  label: 'Mindwave',
  showLegend: true
})

// should basically match the GUI
const bands = {
  signal: [100, 100, 100],
  blink: [130, 130, 130],
  heartRate: [160, 130, 130],

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
const fields = ['signal', 'blink', 'heartRate', 'attention', 'meditation', 'delta', 'theta', 'lowAlpha', 'highAlpha', 'lowBeta', 'highBeta', 'lowGamma', 'midGamma']
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
    if (i !== -1) {
      data[i].y = [...data[i].y.slice(1), newData[field]]
    }
  })
  line.setData(data)
  screen.render()
}

screen.append(line)
line.setData(data)

const mw = new Mindwave(undefined, true) // true starts it quietly

screen.key(['escape', 'q', 'C-c'], (ch, key) => {
  mw.disconnect()
  process.exit(0)
})

screen.render()

// seperate eeg and all others, and send the data to their graphs
mw.on('data', msg => {
  const { eeg, ...data } = msg
  setData(msg)
})

mw.on('eeg', data => setData(data))

// I am leaving off path, will try to let it guess, based on OS
mw.connect()
