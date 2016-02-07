var util = require("util");
var EventEmitter = require("events");

var log4js = require("log4js")
log4js.configure('configs/log4js_configuration.json', { reloadSecs: 300 });
var logger = log4js.getLogger(__filename.split("/").pop(-1).split(".")[0]);

/*

Emits:
  - started: once all info from serial device is obtained
  - swapPacket: new packet incoming from swap network
    - event: SwapPacket
 */
function Firmware(serial) {
    EventEmitter.call(this);
    
    this.serial = serial;
    this.serial.on("data", function(data) {
        self.emit("started", {path: this.path});
    });
}

util.inherits(Firmware, EventEmitter);

Firmware.prototype.setDeviceInUpgradeMode = function(device, firmwareId) {
    this.device = device;
    this.firmwareId = firmwareId;
}

Firmware.prototype.startUpgrade = function() {
    this.inUpgradeMode = true;
}