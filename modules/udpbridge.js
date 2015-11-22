var util = require("util");
var EventEmitter = require("events");
var dgram = require("dgram");

var log4js = require("log4js")
log4js.configure('configs/log4js_configuration.json', { reloadSecs: 300 });
var logger = log4js.getLogger(__filename.split("/").pop(-1).split(".")[0]);

/*
Handles communication to and from LAN network and relay the information
Emits:
  - started: once all info from LAN network is obtained
  - swapPacket: new packet incoming from LAN network
    - event: SwapPacket
 */
function UdpBridge(config) {
    EventEmitter.call(this);
    
    var self = this;
    this.config = config;
    
    logger.info("Starting Broker UDP...");
    this.server = dgram.createSocket("udp4");
    this.client = dgram.createSocket("udp4");
            
    this.server.on("message", function(data, rinfo) {
        logger.debug("Udp Bridge got: %s from %s:%d", data, rinfo.address, rinfo.port);
        var d = data.toString().split("|");
        self.emit(d[0], d[2]);
    });
    
    this.server.bind(this.config.udp.inport, this.config.udp.inhost);
    logger.info("Broker UDP listening on port %s:%d", this.config.udp.inhost, this.config.udp.inport);
    
    this.client.bind(this.config.udp.outport, function() {
        self.client.setBroadcast(true);
        self.emit("started", {type: self.config.impl});
    }); 
}

util.inherits(UdpBridge, EventEmitter);

UdpBridge.prototype.ping = function() {
    this.publish(isomorphic.swap.MQ.Type.MANAGEMENT, "PubSub is started");
};

UdpBridge.prototype.publish = function(topic, data) {
    logger.debug("Sending data to topic %s...", topic);
        
    if(this.config.impl === "udp") {
        var message = JSON.stringify(data);
        logger.debug(message);
        var buffer = new Buffer(topic + "|" + message.length.toString(16) + "|" + message);
        this.client.send(buffer, 0, buffer.length, this.config.udp.outport, this.config.udp.outhost, function(error) {
            if(error) {                 
                logger.error("Sending UDP message failed: %s", error);
            }
        });
    }
};

UdpBridge.prototype.close = function() {
    this.publish(isomorphic.swap.MQ.Type.MANAGEMENT, "PubSub is closed");
    this.server.close();
    this.client.close();
};

module.exports = UdpBridge;
module.exports.name = module.exports.id = 'udpbridge';
module.exports.version = '1.0.0';

module.exports.install = function() {
};

module.exports.uninstall = function() {
};