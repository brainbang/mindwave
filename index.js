var EventEmitter = require('events').EventEmitter;
var serialPort = require('serialport');
var buffy = require('buffy');
var SerialPort = serialPort.SerialPort;

var Mindwave = module.exports = function(){
	EventEmitter.call(this);
};

Mindwave.prototype.__proto__ = EventEmitter.prototype;

Mindwave.prototype.connect = function(port, baud){
	if (!baud){
		baud = 9600;
	}
	var self = this;
	if (baud !== 9600 && baud !== 57600){
		return this.emit('error', 'Invalid baud. Set to 9600 or 57600');
	}
	self.baud = baud;
	self.port = port;

	// TODO: switch baud code if 57600 for higher res data
	// http://developer.neurosky.com/docs/doku.php?id=thinkgear_communications_protocol#thinkgear_command_bytes

	self.serialPort = new SerialPort(self.port, {baudrate: self.baud}, false);
	self.serialPort.open(function(){
		self.emit('connect');
		self.serialPort.on('data', function(data){
			self.emit(self.parse(data));
		});
	});
};

Mindwave.prototype.disconnect = function(){
	var self = this;
	self.serialPort.pause();
	self.serialPort.flush(function(){
		self.serialPort.close(function(){
			self.emit('disconnect');
		});
	});
};

Mindwave.prototype.parse = function(data){
	var reader = buffy.createReader(data);
	while (reader.bytesAhead() > 2) {
		if (reader.uint8() === BT_SYNC && reader.uint8() === BT_SYNC) {
			var len = reader.uint8();
			var payload = reader.buffer(len);
			this.parsePacket(payload);
		}
	}
};

// TODO: add more
// http://developer.neurosky.com/docs/doku.php?id=thinkgear_communications_protocol#data_payload_structure

Mindwave.prototype.parsePacket = function(data) {
  var reader = buffy.createReader(data);
  while(reader.bytesAhead() > 0) {
    switch(reader.uint8()) {
      case CODE_EX:
        this.emit('extended');
        break;

      case CODE_HEART:
      	this.emit('heart', reader.uint8());
      	break;

      case CODE_SIGNAL_QUALITY:
        this.emit('signal', reader.uint8());
        break;

      case CODE_ATTENTION:
        this.emit('attention', reader.uint8());
        break;

      case CODE_MEDITATION:
        this.emit('meditation', reader.uint8());
        break;

      case CODE_BLINK:
        this.emit('blink', reader.uint8());
        break;

      case CODE_WAVE:
        reader.skip(1);
        this.emit('wave', reader.int16BE());
        break;

      case CODE_ASIC_EEG:
        this.emit('eeg', this.parseEEG(reader.buffer(24)));
        break;
    }
  }
};

Mindwave.prototype.parseEEG = function(data) {
  return {
    'delta': this.parse3ByteInteger(data.slice(0,2)),
    'theta': this.parse3ByteInteger(data.slice(3,5)),
    'loAlpha': this.parse3ByteInteger(data.slice(6,8)),
    'hiAlpha': this.parse3ByteInteger(data.slice(9,11)),
    'loBeta': this.parse3ByteInteger(data.slice(12,14)),
    'hiBeta': this.parse3ByteInteger(data.slice(15,17)),
    'loGamma': this.parse3ByteInteger(data.slice(18,20)),
    'midGamma': this.parse3ByteInteger(data.slice(21,24))
  };
};

Mindwave.prototype.parse3ByteInteger = function(data) {
  return (data[0] << 16) |
         (((1 << 16) - 1) & (data[1] << 8)) |
         ((1 << 8) - 1) &
         data[2];
};

var BT_SYNC = 0xAA;
var CODE_EX = 0x55;              // Extended code
var CODE_SIGNAL_QUALITY = 0x02;  // POOR_SIGNAL quality 0-255
var CODE_HEART = 0x03;           // HEART_RATE 0-255
var CODE_ATTENTION = 0x04;       // ATTENTION eSense 0-100
var CODE_MEDITATION = 0x05;      // MEDITATION eSense 0-100
var CODE_BLINK = 0x16;           // BLINK strength 0-255
var CODE_WAVE = 0x80;            // RAW wave value: 2-byte big-endian 2s-complement
var CODE_ASIC_EEG = 0x83;        // ASIC EEG POWER 8 3-byte big-endian integers


