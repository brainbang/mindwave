var Mindwave = require('./index.js');
var kefir = require('kefir')
var mw = new Mindwave();

function toObj (objs) {
  return objs.reduce(function (acc,o) {
    var k = Object.keys(o)[0]
    acc[k] = o[k]
    return acc
  }, {})
}

function prop (p) {
  return (v) => {
    var r = {}
    r[p] = v
    return r
  }
}

function asProp (ev) {
  return kefir.fromEvents(mw, ev).map(prop(ev))
}

var waveS = kefir.fromEvents(mw, 'wave').bufferWithCount(256).map(prop('wave'))

var outS = kefir.zip([
  asProp('eeg'),
  asProp('signal'),
  asProp('meditation'),
  asProp('attention'),
  //waveS,
]).map(toObj)

console.log('connecting')
mw.connect('/dev/cu.MindWaveMobile-DevA');

outS.log()
