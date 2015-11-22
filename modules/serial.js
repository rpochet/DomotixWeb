var util = require("util");
var serialport = require("serialport");
var EventEmitter = require("events");

var log4js = require("log4js")
log4js.configure('configs/log4js_configuration.json', { reloadSecs: 300 });
var logger = log4js.getLogger(__filename.split("/").pop(-1).split(".")[0]);

/*
Handles communication to and from serial port and relay the information
Emits:
  - started: once all info from serial device is obtained
  - swapPacket: new packet incoming from swap network
    - event: SwapPacket
 */
function SerialModem(config) {
    EventEmitter.call(this);
    
    var self = this;
    this.config = config;
    if(config.dummy) {
        self.emit("started");
    } else {
        this.syncword = "qds";
        this.serialPort = new serialport.SerialPort(config.port, {
            baudrate: config.baudrate || 38400,
            parser: serialport.parsers.readline("\r\n")
        });
        this.serialPort.on("open", function() {
            this.on("data", function(data) {
                logger.debug("Received: " + data);
                return self.emit(isomorphic.swap.MQ.Type.SWAP_PACKET, data);
            });
            self.emit("started", {path: this.path});
        });
        this.serialPort.on("close", function() {
            F.stop();
        });
    }
}

util.inherits(SerialModem, EventEmitter);

SerialModem.prototype.send = function(packet) {
    //logger.debug("Sent: " + packet);
    if(this.config.dummy) {
        return;
    } else {
        return this.serialPort.write(packet + "\r");
    }
};

SerialModem.prototype.command = function(str) {
    //logger.debug("Sent: " + str);
    if(this.config.dummy) {
        return;
    } else {
        return this.serialPort.write(str + "\r");
    }
};

SerialModem.prototype.ping = function(callback) {
    if(this.config.dummy) {
        return;
    } else {
        this.serialPort.write("AT\r");
        return this.once("data", function(data) {
            if (data === !"OK") {
                //logger.warn("Error while pinging: " + data);
            } else {
                //logger.info("Ping OK");
            }
            if (callback()) {
                return callback(data);
            }
        });
    }
};

//var serialModem = new SerialModem(F.global.Config.serial);
module.exports = SerialModem;
module.exports.name = module.exports.id = 'serial';
module.exports.version = '1.0.0';

module.exports.install = function() {
};

module.exports.uninstall = function() {
};