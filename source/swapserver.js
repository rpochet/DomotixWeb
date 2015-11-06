var util = require("util");
var clone = require('clone');
var SerialModem = MODULE("serial")
var swapProducts = undefined;
var swapDevices = undefined;
var levels = undefined;
var lights = undefined;
var config = F.global.Config;
var swap = isomorphic.swap;
var serialModem = null;
var log4js = require("log4js")
log4js.configure('configs/log4js_configuration.json', { reloadSecs: 300 });
var logger = log4js.getLogger(__filename.split("/").pop(-1).split(".")[0]);

var newSwapDevice = undefined;
var newSwapDeviceCleaner = undefined;

var sendSwapPacket = function(functionCode, address, registerId, regValue) {
    var swapPacket = new swap.SwapPacket();
    swapPacket.source = config.network.address;
    swapPacket.dest = address;
    swapPacket.func = functionCode;
    swapPacket.regAddress = address;
    swapPacket.regId = registerId;
    if(regValue) {        
        swapPacket.regValue = regValue;
    }
    
    var swapDevice = swapDevices["DEV" + swap.num2byte(address)];
    if(swapDevice == undefined) {
        logger.error(util.format("Unkown SWAP Device address %s", address));
    }
    
    if(swapDevice.pwrdownmode){
        //addSwapPacketInQueue(swapDevice, swapPacket);
    } else {
        logger.info(util.format("Sending SWAP Packet %s", swapPacket));
        serialModem.send(swapPacket);
        //addSwapPacket(swapPacket);
    }
}

var saveSwapDevice = function(swapDevice) {
    if(swapDevice._rev) {
        MODEL("devices").updateSwapDevice(swapDevice).then(function(data) {
            swapDevices[data._id]._rev = data._rev;
            logger.info(util.format("Devices %s updated", data._id));
            F.emit(swap.MQ.Type._ALL, swap.MQ.Type.SWAP_DEVICE, data._id);
        }).catch(function(err) {
            logger.error(util.format("Devices %s not updated: %s", swapDevice._id, err));
        }); 
    } else {
        MODEL("devices").createSwapDevice(swapDevice).then(function(data) {
            swapDevices[data._id]._rev = data._rev;
            logger.info(util.format("Devices %s created", data._id));
            F.emit(swap.MQ.Type._ALL, swap.MQ.Type.SWAP_DEVICE, data._id);
        }).catch(function(err) {
            logger.error(util.format("Devices %s not created: %s", swapDevice._id, err));
        });
    }
};

var deleteSwapDevice = function(swapDevice) {
    MODEL("devices").deleteSwapDevice(swapDevice).then(function(data) {
        delete swapDevices[data._id];
        logger.info(util.format("Devices %s deleted", data._id));
        F.emit(swap.MQ.Type._ALL, swap.MQ.Type.SWAP_DEVICE, data._id);
    }).catch(function(err) {
        logger.error(util.format("Devices %s not deleted: %s", swapDevice._id, err));
    });
}

var swapPacketReceived = function(swapPacket) {
    var swapDevice = swapDevices["DEV" + swap.num2byte(swapPacket.regAddress)];
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
    if(swapPacket.func !== swap.Functions.STATUS) {
        logger.debug(util.format("SWAP Device of type %s is not supported", swapPacket.func));
        return;
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
            swapDevice.state = swapPacket.regValue[0];
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
            if(swapDevice.address != swapPacket.regValue[0]) {
                var changeSwapDevice = clone(swapDevice);
                delete changeSwapDevice._rev;
                changeSwapDevice._id = "DEV" + swap.num2byte(swapPacket.regValue[0]);
                changeSwapDevice.address = swap.num2byte(swapPacket.regValue[0]);
                changeSwapDevice.nonce = swapPacket.nonce;
                changeSwapDevice.lastStatusTime = swapPacket.time;
                swapDevices[changeSwapDevice._id] = changeSwapDevice;
                saveSwapDevice(changeSwapDevice);
                deleteSwapDevice(swapDevice);
            }
            break;
        case swap.Registers.txInterval.id:
            swapDevice.txInterval = swap.arrayToInt(swapPacket.regValue);
            break;
        default:
            var register = getRegister(swapDevice, swapPacket.regId);
            if(register) {
                register.value = swapPacket.regValue;
                logger.info(util.format("New value for register %s for SWAP Device %s", register.name, swapPacket.regAddress));
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
                saveSwapDevice(swapDevice);                
            } else {
                logger.warn(util.format("Product is not available for SWAP Device %s", swapPacket.regAddressnewSwapDevice.productCode + newSwapDevice.hardwareVersion + newSwapDevice.firmwareVersion));
            }
            newSwapDevice = undefined;
        }    
    } else {    
        swapDevice.nonce = swapPacket.nonce;
        swapDevice.lastStatusTime = swapPacket.time;
        saveSwapDevice(swapDevice);
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
    
    this.refreshLights();
    
    this.refreshSwapProducts();
    
    this.refreshSwapDevices();
    
    logger.info("Serial initialisation...");
    serialModem = new SerialModem(config.serial);
    serialModem.ping();
    serialModem.on("started", function() {
        logger.info("Serial initialised");
    });
    serialModem.on(swap.MQ.Type.SWAP_PACKET, function(rawSwapPacket) {
        if(rawSwapPacket[0] == "(") {
            //var ccPacket = new swap.CCPacket(rawSwapPacket.subtr(0, rawSwapPacket.length - 1)); //  # remove \r
            var ccPacket = new swap.CCPacket(rawSwapPacket);
            if(ccPacket.data) {                
                var swapPacket = new swap.SwapPacket(ccPacket);
                swapPacketReceived(swapPacket);
            }
            else {
                //logger.warn "Unknown data received from Serial Bridge: #{rawSwapPacket} but must be a CCPacket"
            }
        } else {   
            //logger.warn "Unknown data received from Serial Bridge: #{rawSwapPacket} but must be like '(xxxx)yyyyyy'"
        }
    });
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
    logger.info("Levels initialisation...");
    MODEL("house").getLevels().then(function(data) {
        levels = data;               
        levels.forEach(function(level) {                
            level.rooms.forEach(function(room) {
                room.lights = new Array();
            });
        });
        logger.info("Levels initialised");
        refreshLights();
    });
};

exports.getLights = function() {
    return lights;
};

exports.refreshLights = function() {
    logger.info("Lights initialisation...");
    MODEL("house").getLights().then(function(data) {
        lights = data;
        logger.info("Lights initialised");
        lights.forEach(function(light) {
            light.location.room_id;
            levels.forEach(function(level) {                
                level.rooms.forEach(function(room) {
                    if(light.location.room_id == room.id) {
                        room.lights.push(light);
                    }
                });
            });
        });
    });
};
    
exports.sendSwapQuery = function(regAddress, regId) {
    console.log(util.format("Sending SwapQuery to register %s on device %s...", regId, regAddress));
    sendSwapPacket(swap.Functions.QUERY, regAddress, regId);
};

exports.sendSwapCommand = function(regAddress, regId, regValue) {
    console.log(util.format("Sending SwapCommand to register %s on device %s with data %s...", regId, regAddress, regValue));
    sendSwapPacket(swap.Functions.COMMAND, regAddress, regId, regValue);
};
    
exports.sendSwapPacket = function(func, regAddress, regId, regValue) {
    console.log(util.format("Sending SwapPacket %s to register %s on device %s with data %s...", func, regId, regAddress, regValue));
    sendSwapPacket(func, regAddress, regId, regValue);
};

exports.messageFromCloud = function(rawSwapPacket) {
    serialModem.emit(swap.MQ.Type.SWAP_PACKET, "(FFFF)" + rawSwapPacket);
};
