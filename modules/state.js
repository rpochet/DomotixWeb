var util = require("util");
var EventEmitter = require("events");

var log4js = require("log4js")
log4js.configure('configs/log4js_configuration.json', { reloadSecs: 300 });
var logger = log4js.getLogger(__filename.split("/").pop(-1).split(".")[0]);

/*
Handles communication to and from LAN network and relay the information
Emits:
  - states_updated: 
 */
function State(config) {
    EventEmitter.call(this);
    this.states = {};
}

util.inherits(State, EventEmitter);

State.prototype.saveState = function(type, id, value) {
    if(this.states[type] == undefined) {
        this.states[type] = {};
    }
    this.states[type][id] = {
        "date": new Date(),
        "value": value
    };
    this.emit("state_updated", this.states);
};

State.prototype.getStates = function() {
    return this.states;
};

State.prototype.getState = function(type) {
    return this.states[type];
};

State.prototype.refreshState = function(type) {
    logger.info("State initialisation...");
    MODEL("state").getState().then(function(data) {
        state = data;
        logger.info("State initialised");
    });
};

State.prototype.close = function() {
};

module.exports = State;
module.exports.name = module.exports.id = 'state';
module.exports.version = '1.0.0';

module.exports.install = function() {
};

module.exports.uninstall = function() {
};