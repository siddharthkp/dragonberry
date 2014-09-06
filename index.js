var Gpio = require('onoff').Gpio;
var sleep = require('sleep');
var https = require('https');
var os=require('os');

var id_que = [];
var lccD = 0;

var displayPorts = {
  RS:   7,
  E:    8,
  D4:   25,
  D5:   24,
  D6:   23,
  D7:   18,
	
  CHR: 1,
  CMD: 0
};
function buZZ1 () {
    var led = new Gpio(14, 'out');
    led.writeSync(1);
    setTimeout(function(){
       led.writeSync(0);
    }, 200);
}
function buZZ (timeout) {
    var led = new Gpio(14, 'out');
    led.writeSync(1);
    setTimeout(function(){
       led.writeSync(0);
       setTimeout(function(){ led.writeSync(1)
	   setTimeout(function(){led.writeSync(0)}, 400);	
       }, 200);
    }, 200);
}

function LCD(displayConfig) {
	displayConfig = displayConfig || {};
	
	this._displayConfig = {
		width: displayConfig.width || 16,
		line1: 0x80,
		line2: 0xc0,
		
		pulse: displayConfig.pulse || 0.0001,
		delay: displayConfig.delay || 0.0001
	};
	
	this._ports = {
		rs:	null,
		e:	null,
		d4:	null,
		d5:	null,
		d6:	null,
		d7:	null
	};
}

LCD.prototype._sleep = function (seconds) {
	sleep.usleep(seconds * 1000000);
};

LCD.prototype._initDisplay = function () {
	this.writeByte(0x33, displayPorts.CMD);
	this.writeByte(0x32, displayPorts.CMD);
	this.writeByte(0x28, displayPorts.CMD);
	this.writeByte(0x0C, displayPorts.CMD);
	this.writeByte(0x06, displayPorts.CMD);
	this.writeByte(0x01, displayPorts.CMD);
};

LCD.prototype.init = function (callback) {
	this._ports.d4 = new Gpio(displayPorts.D4, 'out');
	this._ports.d5 = new Gpio(displayPorts.D5, 'out');
	this._ports.d6 = new Gpio(displayPorts.D6, 'out');
	this._ports.d7 = new Gpio(displayPorts.D7, 'out');
	
	this._ports.rs = new Gpio(displayPorts.RS, 'out');
	this._ports.e  = new Gpio(displayPorts.E,  'out');

	this._initDisplay();
	callback.call(this);
};

LCD.prototype._clean = function () {
	for (var key in this._ports) {
		this._ports[key].unexport();
	}
};

LCD.prototype.shutdown = function () {
	// this.writeString("\n");
	this._clean();
};

LCD.prototype.writeString = function (string) {
	var parts = string.split("\n");
	var lines = [this._displayConfig.line1, this._displayConfig.line2];
	
	for (var key in parts) {
		this.writeByte(lines[key], displayPorts.CMD);
		
		for (var i = 0; i != this._displayConfig.width; i++) {
			var c = parts[key].charCodeAt(i) || 0x20;
			
			this.writeByte(c, displayPorts.CHR);
		}
	}
};

var timeOutCounter = 0;

LCD.prototype.marqueeString = function (secondLine) {
	var lcdData = this;
	
	lcdData.stringCounter = 0;
	timeOutCounter = setInterval(function() {
		if (lcdData.stringCounter + 16 < lcdData.stringData.length ) {
			lcdData.stringCounter += 1;
			lcdData.stringShown = lcdData.stringData.substring(lcdData.stringCounter, 16);
			if (!secondLine) {
				secondLine = "\n";
			}
		        lcdData.init(function () {
				lcdData.writeString(lcdData.stringShown+"\n"+secondLine);
				lcdData.shutdown();
		        });

		} else {
			lcdData.stringCounter = 0;
		}
	}, 300);
};

LCD.prototype.writeByte = function (bits, mode) {
	this._ports.rs.writeSync(mode);
	this._ports.d4.writeSync(0);
	this._ports.d5.writeSync(0);
	this._ports.d6.writeSync(0);
	this._ports.d7.writeSync(0);
	
	if ((bits & 0x10) == 0x10) {
		this._ports.d4.writeSync(1);
	}
	
	if ((bits & 0x20) == 0x20) {
		this._ports.d5.writeSync(1);
	}
	
	if ((bits & 0x40) == 0x40) {
		this._ports.d6.writeSync(1);
	}
	
	if ((bits & 0x80) == 0x80) {
		this._ports.d7.writeSync(1);
	}
	
	this._sleep(this._displayConfig.delay);
	this._ports.e.writeSync(1);
	this._sleep(this._displayConfig.pulse);
	this._ports.e.writeSync(0);
	this._sleep(this._displayConfig.delay);
	
	this._ports.d4.writeSync(0);
	this._ports.d5.writeSync(0);
	this._ports.d6.writeSync(0);
	this._ports.d7.writeSync(0);
	
	if ((bits & 0x1) == 0x1) {
		this._ports.d4.writeSync(1);
	}
	
	if ((bits & 0x2) == 0x2) {
		this._ports.d5.writeSync(1);
	}
	
	if ((bits & 0x4) == 0x4) {
		this._ports.d6.writeSync(1);
	}
	
	if ((bits & 0x8) == 0x8) {
		this._ports.d7.writeSync(1);
	}
	
	this._sleep(this._displayConfig.delay);
	this._ports.e.writeSync(1);
	this._sleep(this._displayConfig.pulse);
	this._ports.e.writeSync(0);
	this._sleep(this._displayConfig.delay);
};

function fetcher() {
	setInterval(function() {
		fetch();
		console.log('Fetching');
	}, 3000);
}

function fetch() {
    var options = {
        host: 'stag-ray-knowlarity.practo.com',
        path: '/api/v1/notification',
	headers: { "X-AUTH-TOKEN": "fd4645ae98eaacf502a70ebe002c40fcbf825909"}
    };
    var callback = function(response) {
        var data = '';
        response.on('data', function(chunk) {
            data += chunk;
        });
        response.on('end', function() {
            data = JSON.parse(data);
	    lccD = new LCD();
	    
            if (data && data.message && id_que.indexOf(data.id)===-1) {
		buZZ();
		clearInterval(timeOutCounter);
		lccD.stringData = data.message;
		id_que.push(data.id);
		lccD.marqueeString();
		console.log('data received');
	    } else {
                console.log('No data');
	    }
        });
    }
    https.get(options, callback).end();

}

var IPCOUNTER = 1;
var IPTIMER = 
setInterval(function() {
	var ifaces=os.networkInterfaces();
	var messagess = '';
	for (var dev in ifaces) {
	  var alias=0;
	  ifaces[dev].forEach(function(details){
	    if (details.family=='IPv4') {
	      messagess += (dev+(alias?':'+alias:'')+details.address+'\n');
	      ++alias;
	    }
	  });
	}
        buZZ1();
	var lcd = new LCD();
        lcd.init(function () {
            lcd.writeString(messagess);
	    lcd.shutdown();
        });
	IPCOUNTER++;
	if (IPCOUNTER >= 2) {
		clearInterval(IPTIMER);
		setTimeout(function() { fetcher(); }, 1000);
	}
}, 10000);
