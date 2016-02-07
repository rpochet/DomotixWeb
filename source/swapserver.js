var util = require("util");
var clone = require('clone');
var moment = require("moment");
var SerialModem = MODULE("serial");
var UdpBridge = MODULE("udpbridge");
var State = MODULE("state");
var swapProducts = undefined;
var swapDevices = undefined;
var levels = undefined;
//var lights = undefined;
var config = F.global.Config;
var swap = isomorphic.swap;
var serialModem = null;
var udpBridge = null;
var state = null;

var log4js = require("log4js")
log4js.configure('configs/log4js_configuration.json', { reloadSecs: 300 });
var logger = log4js.getLogger(__filename.split("/").pop(-1).split(".")[0]);

// New Device
var newSwapDevice = undefined;
var newSwapDeviceCleaner = undefined;

// Upgrade mode
var upgradeInProgress = false;
var upgradedDevice = null;
var firmware = null;

var startUpgrade = function(devAddress, firmwareId) {
    upgradeInProgress = true;
    upgradedDevice = {
        address: devAddress
    };
    firmware = {
        firmwareId: firmwareId,
        ready: false,
        requested: 0,
        data: []
    };
    MODEL("products").getSwapDeviceFirmare(firmwareId).then(function(data) {
        firmware.data = data.hexFile;
        firmware.ready = true;
        logger.info("Firmware %s ready for SWAP Device %s", firmware.firmwareId, upgradedDevice.address);
    }).catch(function(err) {
        logger.error("Failed to load SWAP Device firmware %s", firmware.firmwareId, err);
    }); 
}

var sendSwapPacketArgs = function(functionCode, address, registerId, regValue) {
    var swapPacket = new swap.SwapPacket();
    swapPacket.source = config.network.address;
    swapPacket.dest = address;
    swapPacket.func = functionCode;
    swapPacket.regAddress = address;
    swapPacket.regId = registerId;
    if(regValue) {        
        swapPacket.regValue = regValue;
    }
    sendSwapPacket(swapPacket);
}
    
var sendSwapPacket = function(swapPacket) {
    var swapDevice = swapDevices["DEV" + swap.num2byte(swapPacket.regAddress)];
    if(swapDevice == undefined) {
        logger.error("Unkown SWAP Device address %s", swapPacket.regAddress);
    }
    
    if(swapDevice.pwrdownmode){
        //addSwapPacketInQueue(swapDevice, swapPacket);
    } else {
        logger.debug("Sending SWAP Packet %s", swapPacket);
        serialModem.send(swapPacket);
        //addSwapPacket(swapPacket);
    }
}

var saveSwapDevice = function(swapDevice) {
    MODEL("devices").updateSwapDevice(swapDevice).then(function(data) {
        //swapDevices[data._id]._rev = data._rev;
        logger.info(util.format("Devices %s updated (%s)", data._id, data._rev));
        F.emit(swap.MQ.Type._ALL, swap.MQ.Type.SWAP_DEVICE, data._id);
    }).catch(function(err) {
        logger.error("Devices %s not updated: %s", swapDevice._id, JSON.stringify(err));
    }); 
}

var createSwapDevice = function(swapDevice) {
    MODEL("devices").createSwapDevice(swapDevice).then(function(data) {
        //swapDevices[data._id]._rev = data._rev;
        logger.info("Devices %s created", data._id);
        F.emit(swap.MQ.Type._ALL, swap.MQ.Type.SWAP_DEVICE, data._id);
    }).catch(function(err) {
        logger.error("Devices %s not created: %s", swapDevice._id, JSON.stringify(err));
    });
};

var deleteSwapDevice = function(swapDevice) {
    MODEL("devices").deleteSwapDevice(swapDevice).then(function(data) {
        delete swapDevices[data._id];
        logger.info("Devices %s deleted", data._id);
        F.emit(swap.MQ.Type._ALL, swap.MQ.Type.SWAP_DEVICE, data._id);
    }).catch(function(err) {
        logger.error("Devices %s not deleted: %s", swapDevice._id, JSON.stringify(err));
    });
}

var swapPacketReceived = function(swapPacket) {
    logger.debug("SWAP Packet received %s", swapPacket);
    //MODEL("packets").saveSwapPacket(swapPacket);
    
    var swapDevice = swapDevices["DEV" + swap.num2byte(swapPacket.regAddress)];
    var swapRegister = null;
    if(swapDevice == undefined) {
        logger.warn(util.format("Unkown SWAP Device address %s", swapPacket.regAddress));
        if(newSwapDevice == undefined) {
            newSwapDevice = {};
            newSwapDeviceCleaner = setTimeout(function() {
                newSwapDevice = undefined;
            }, config.state.newDevice);
        }
        newSwapDevice._id = "DEV" + swap.num2byte(swapPacket.regAddress);
        newSwapDevice.address = swapPacket.regAddress;
    }
    
    if(swapPacket.func == swap.Functions.COMMAND) {
        logger.debug(util.format("SWAP Device of type QUERY is not supported"));
        return;
    } else if(swapPacket.func == swap.Functions.QUERY) {
        if(upgradeInProgress || (swapDevice == undefined && swapPacket.regId == swap.Register.upgrade.id)) {
            logger.info(util.format("SWAP Device %s waiting for HEX file line %s", upgradedDevice.address, swapPacket.regValue));
            if(firmware.ready) {
                firmware.requested = swap.arrayToInt(swapPacket.regValue);
                var line = firmware.data[firmware.requested].substring(3);
                logger.info("Sending HEX file line %s to device %s with data %s...", firmware.requested, upgradedDevice.address, line);
                sendSwapPacketArgs(swap.Functions.STATUS, upgradedDevice.address, swapPacket.regId, line);       
            }
        } else {
            logger.debug(util.format("SWAP Device of type QUERY is not supported"));
        }
        return;            
    } else if(upgradeInProgress 
                && swapPacket.func == swap.Functions.STATUS 
                && swapPacket.regAddress == upgradedDevice.address 
                && swapPacket.regId == swap.Registers.state.id 
                && swapPacket.regValue[0] == swap.SwapStates.RESTART) {
        this.upgradeInProgress = false;
    }
    
    switch(swapPacket.regId) {
        case swap.Registers.productCode.id:
            if(newSwapDevice) {
                newSwapDevice.productCode = swap.array2string(swapPacket.regValue);
            }
            break;
        case swap.Registers.hardwareVersion.id:
            if(newSwapDevice) {
                newSwapDevice.hardwareVersion = swap.array2string(swapPacket.regValue);
            }
            break;
        case swap.Registers.firmwareVersion.id:
            if(newSwapDevice) {
                newSwapDevice.firmwareVersion = swap.array2string(swapPacket.regValue);
            }
            break;
        case swap.Registers.state.id:
            if(swapDevice) {
                swapDevice.state = swapPacket.regValue[0];
            }
            break;
        case swap.Registers.channel.id:
            break;
        case swap.Registers.security.id:
            break;
        case swap.Registers.password.id:
            break;
        case swap.Registers.nonce.id:
            break;
        case swap.Registers.network.id:
            break;
        case swap.Registers.address.id:
            if(swapDevice && swapDevice.address != swapPacket.regValue[0]) {
                var changeSwapDevice = clone(swapDevice);
                delete changeSwapDevice._rev;
                changeSwapDevice._id = "DEV" + swap.num2byte(swapPacket.regValue[0]);
                changeSwapDevice.address = swap.num2byte(swapPacket.regValue[0]);
                changeSwapDevice.nonce = swapPacket.nonce;
                changeSwapDevice.lastStatusTime = swapPacket.time;
                swapDevices[changeSwapDevice._id] = changeSwapDevice;
                createSwapDevice(changeSwapDevice);
                deleteSwapDevice(swapDevice);
            }
            break;
        case swap.Registers.txInterval.id:
            if(swapDevice) {
                swapDevice.txInterval = swap.arrayToInt(swapPacket.regValue);
            }
            break;
        default:
            if(swapDevice) {
                swapRegister = getRegister(swapDevice, swapPacket.regId);
                if(swapRegister) {
                    swapRegister.value = swapPacket.regValue;
                    logger.info(util.format("New value for register %s for SWAP Device %s", swapRegister.name, swapPacket.regAddress));
                }
            }
            break;
    }
    
    if(newSwapDevice) {        
        if(newSwapDevice.productCode && newSwapDevice.hardwareVersion && newSwapDevice.firmwareVersion) {
            swapDevice = swapProducts[newSwapDevice.productCode + newSwapDevice.hardwareVersion + newSwapDevice.firmwareVersion];
            if(swapDevice) {             
                delete swapDevice._rev;
                swapDevice._id = newSwapDevice._id;
                swapDevice.networkId = config.network.networkId;
                swapDevice.frequencyChannel = config.network.frequencyChannel;
                swapDevice.address = newSwapDevice.address;
                swapDevice.nonce = swapPacket.nonce;
                swapDevice.lastStatusTime = swapPacket.lastStatusTime;
                swapDevices[swapDevice._id] = swapDevice;
                createSwapDevice(swapDevice);                
            } else {
                logger.warn(util.format("Product is not available for SWAP Device %s", swapPacket.regAddressnewSwapDevice.productCode + newSwapDevice.hardwareVersion + newSwapDevice.firmwareVersion));
            }
            newSwapDevice = undefined;
        }    
    } else {    
        swapDevice.nonce = swapPacket.nonce;
        swapDevice.lastStatusTime = swapPacket.time;
        saveSwapDevice(swapDevice);
        if(swapRegister) { // Only for non-standard register   
            handleSwapPacket(swapPacket, swapDevice, swapRegister);
        }
    }
};

var handleSwapPacket = function(swapPacket, swapDevice, swapRegister) {
    if(swapDevice.product.productCode == swap.LightController.productCode) {
        if(swapRegister.id == swap.LightController.Registers.Outputs.id) {
            state.saveState(swap.MQ.Type.LIGHT_STATUS, swapDevice.address, swapRegister.value);
        } else if(swapRegister.id == swap.LightController.Registers.PressureTemperature.id) {
            swapRegister.endpoints.forEach(function(endpoint) {
                var stateValue = swap.getRegisterPartInUnit(swapRegister, endpoint, endpoint.units[0]);
                stateValue.location = swapDevice.location;
                state.saveState(endpoint.name, swapDevice.address, stateValue);
            });
        }
    } else if(swapDevice.product.productCode == swap.LightSwitch.productCode) {
        if(swapRegister.id == swap.LightSwitch.Registers.Voltage.id) {
            var stateValue = swap.getRegisterPartInUnit(swapRegister, swapRegister.endpoints[0], swapRegister.endpoints[0].units[0]);
            stateValue.location = swapDevice.location;
            state.saveState(swap.MQ.Type.VOLTAGE, swapDevice.address, stateValue);
        } else if(swapRegister.id == swap.LightSwitch.Registers.Temperature.id) {
            var stateValue = swap.getRegisterPartInUnit(swapRegister, swapRegister.endpoints[0], swapRegister.endpoints[0].units[0]);
            stateValue.location = swapDevice.location;
            state.saveState(swap.MQ.Type.TEMPERATURE, swapDevice.address, stateValue);
        }
    }
};

var getRegister = function(swapDevice, regId) {
    var foundRegister = null;
    swapDevice.configRegisters.forEach(function(register) {
        if(register.id == regId) {
            foundRegister = register;
            return false;
        }
    }, this);
    if(foundRegister) {
        return foundRegister;
    }
    swapDevice.regularRegisters.forEach(function(register) {
        if(register.id == regId) {
            foundRegister = register;
            return false;
        }
    }, this);
    return foundRegister;
};
        
exports.init = function() {
    
    this.refreshLevels();
    
    //this.refreshLights();
    
    this.refreshSwapProducts();
    
    this.refreshSwapDevices();
    
    logger.info("Serial Modem initialisation...");
    serialModem = new SerialModem(config.serial);
    serialModem.on("started", function() {
        logger.info("Serial Modem initialised");
        serialModem.ping();
    });
    serialModem.on(swap.MQ.Type.SWAP_PACKET, function(rawSwapPacket) {
        logger.debug("Data received from serial %s", rawSwapPacket);
        if(rawSwapPacket[0] == "(") {
            var ccPacket = new swap.CCPacket(rawSwapPacket);
            if(ccPacket.data) {                
                var swapPacket = new swap.SwapPacket(ccPacket);
                swapPacketReceived(swapPacket);
            } else {
                logger.warn("Unknown data received from Serial Bridge: must be a CCPacket");
            }
        } else {   
            logger.warn("Unknown data received from Serial Bridge: must be like '(xxxx)yyyyyy'");
        }
    });
    
    logger.info("UDP Bridge initialisation...");
    udpBridge = new UdpBridge(config.broker);
    udpBridge.on("started", function() {
        logger.info("UDP Bridge initialised");
        udpBridge.ping();
    });
    udpBridge.on(swap.MQ.Type.SWAP_PACKET, function(rawSwapPacket) {
        logger.debug("Data received from UDP Bridge %s", rawSwapPacket);
        var ccPacket = new swap.CCPacket('(0000)' + rawSwapPacket);
        if(ccPacket.data) {                
            var swapPacket = new swap.SwapPacket(ccPacket);
            sendSwapPacket(swapPacket);
        }
    });
    
    logger.info("State initialisation...");
    state = new State(config.state);
    state.on("state_updated", function(state) {
        var stateType = state.last.split("/")[0];
        F.emit(swap.MQ.Type._ALL, stateType, state[stateType]);
    });
    logger.info("State initialised");
};

exports.getSwapProducts = function() {
    return swapProducts;
};

exports.refreshSwapProducts = function() {
    logger.info("SWAP Products initialisation...");
    MODEL("products").getSwapProducts().then(function(data) {
        swapProducts = data;
        logger.info("SWAP Products initialised");
    });
};

exports.getSwapDevices = function() {
    return swapDevices;
};

exports.refreshSwapDevices = function() {
    logger.info("SWAP Devices initialisation...");
    MODEL("devices").getSwapDevices().then(function(data) {
        swapDevices = data;
        logger.info("SWAP Devices initialised");
    });
};

exports.getConfig = function() {
    return config;
};

exports.getLevels = function() {
    return levels;
};

exports.refreshLevels = function() {
    var self = this;
    logger.info("Levels initialisation...");
    MODEL("house").getLevels().then(function(data) {
        levels = data;               
        levels.forEach(function(level) {      
            level.lights = new Array();          
            level.rooms.forEach(function(room) {
                room.lights = new Array();
            });
        });
        //F.emit(swap.MQ.Type._ALL, swap.MQ.Type., levels);
        logger.info("Levels initialised");
        //self.refreshLights();
    });
};

exports.getLights = function() {
    logger.debug(state.getStates());
    return state.getState(swap.MQ.Type.LIGHT_STATUS);
};

exports.refreshLights = function() {
    logger.info("Lights initialisation...");
    //MODEL("house").clearCache("lights");
    MODEL("house").getLights().then(function(data) {
        lights = data;
        lights.forEach(function(light) {
            levels.forEach(function(level) {  
                if(light.location.room_id == -1) {
                    level.lights.push(light);
                }              
                level.rooms.forEach(function(room) {
                    if(light.location.room_id == room.id) {
                        room.lights.push(light);
                    }
                });
            });
        });
        logger.info("Lights initialised");
    });
};

exports.refreshState = function() {
    this.emitState();
    //state.refreshState();
};

exports.getState = function() {
    return state.getState();
};

exports.emitState = function() {
    for(var stateType in state.getStates()) {
        if(stateType !== "last" && !stateType.startsWith('_')) {
            F.emit(swap.MQ.Type._ALL, stateType, state[stateType]);
        }
    }
};
    
exports.sendSwapQuery = function(regAddress, regId, regValue) {
    if(regValue) {
        logger.info("Sending SwapQuery to register %s on device %s with data %s...", regId, regAddress, regValue);        
    } else {        
        logger.info("Sending SwapQuery to register %s on device %s...", regId, regAddress);
    }
    sendSwapPacketArgs(swap.Functions.QUERY, regAddress, regId, regValue);
};

exports.sendSwapCommand = function(regAddress, regId, regValue) {
    logger.info("Sending SwapCommand to register %s on device %s with data %s...", regId, regAddress, regValue);
    sendSwapPacketArgs(swap.Functions.COMMAND, regAddress, regId, regValue);
};
    
exports.sendSwapPacket = function(func, regAddress, regId, regValue) {
    logger.info("Sending SwapPacket %s to register %s on device %s with data %s...", func, regId, regAddress, regValue);
    sendSwapPacketArgs(func, regAddress, regId, regValue);
};

exports.messageFromCloud = function(rawSwapPacket) {
    serialModem.emit(swap.MQ.Type.SWAP_PACKET, "(FFFF)" + rawSwapPacket);
};

exports.updateDevice = function(updatedSwapDevice) {
    var swapDevice = swapDevices[updatedSwapDevice._id];
    if(swapDevice) {
        /*if((swapDevice.location.x != swapDevice.location.x) ||
            (swapDevice.location.y != swapDevice.location.y) ||
            (swapDevice.location.z != swapDevice.location.z) ||
            (swapDevice.location.room.id != swapDevice.location.room.id)) {
            
        }*/
        //updatedSwapDevice._rev = swapDevice._rev;
        swapDevices[updatedSwapDevice._id] = updatedSwapDevice;
        saveSwapDevice(updatedSwapDevice);
    }
    throw new Error("Invalid SWAP Device " + updatedSwapDevice._id);
};

exports.startUpgrade = function(devAddress, firmareId) {
    startUpgrade(devAddress, firmareId);
};
