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
    this.states = new Array();
}

util.inherits(State, EventEmitter);

State.prototype.saveState = function(type, id, value) {
    if(this.states[type] == undefined) {
        this.states[type] = new Array();
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

State.prototype.close = function() {
};

module.exports = State;
module.exports.name = module.exports.id = 'state';
module.exports.version = '1.0.0';

module.exports.install = function() {
};

module.exports.uninstall = function() {
};