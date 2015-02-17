var Mindwave = require('./index.js');
var mw = new Mindwave();

mw.on('eeg', function(eeg){
	console.log('eeg', eeg);
});

mw.on('signal', function(signal){
	console.log('signal', signal);
});

mw.on('attention', function(attention){
	console.log('attention', attention);
});

mw.on('meditation', function(meditation){
	console.log('meditation', meditation);
});

mw.on('blink', function(blink){
	console.log('blink', blink);
});

mw.on('wave', function(wave){
	console.log('wave', wave);
});

mw.connect('/dev/cu.MindWaveMobile-DevA');