Config = require "config"
SerialModem = require "../swap/serialmodem" if not Config.serial.dummy
SerialModem = require "../swap/dummyserialmodem" if Config.serial.dummy
PubSub = require "../swap/pubsub"
State = require "../swap/state"
swap = require "../../client/code/common/swap"
cradle = require "cradle"
ss = require "socketstream"
util = require "util"
sleep = require "sleep"
eventEmitter = require("events").EventEmitter
moment = require "moment"
logger = require("log4js").getLogger(__filename.split("/").pop(-1).split(".")[0])
poolr  = require("poolr").createPool

dbPanstamp = new(cradle.Connection)(Config.couchDB.host, Config.couchDB.port).database("panstamp")
dbEvents = new(cradle.Connection)(Config.couchDB.host, Config.couchDB.port).database("events")
dbPanstampPackets = new(cradle.Connection)(Config.couchDB.host, Config.couchDB.port).database("panstamp_packets")
dbPanstampEvents = new(cradle.Connection)(Config.couchDB.host, Config.couchDB.port).database("panstamp_events")

dbPanstampPool = poolr(1, dbPanstamp)
dbEventsPool = poolr(1, dbEvents)
dbPanstampPacketsPool = poolr(1, dbPanstampPackets)
dbPanstampEventsPool = poolr(1, dbPanstampEvents)

state = undefined
pubSub = undefined
historicLength = 40


####################################################################################
####################################################################################
# APPLICATION DATA
developers = []
devicesConfig = {}
devices = {}
newDevice = 
    product:
        productCode: ""
        hardware: ""
        firmware: ""
levels = {}
lights = {}
swapPackets = []
swapEvents = []


####################################################################################
#
####################################################################################
initLevels = () ->
    levels = {}
    dbPanstamp.get "levels", (err, doc) ->
        return logger.error "Get levels failed: #{JSON.stringify(err)}" if err?
        levels = doc.levels
        logger.info "Got #{levels.length} levels"
        for level in levels
            do (level) ->
                room.lights = [] for room in level.rooms
        initLights()

####################################################################################
#
####################################################################################
initLights = () ->
    lights = {}
    dbPanstamp.get "lights", (err, doc) ->
        return logger.error "Get lights failed: #{JSON.stringify(err)}" if err?
        lights = doc.lights
        logger.info "Got #{lights.length} lights"
        for light in lights
            do (light) ->
                for level in levels
                    do (level) ->
                        for room in level.rooms
                            do (room) ->
                                room.lights.push light if room.id == light.location.room_id
        initDevicesConfig()

####################################################################################
#
####################################################################################
initDevicesConfig = () ->
    developers = []
    devicesConfig = {}
    logger.info "Init devices configuration..."
    dbPanstamp.get "devices", (err, doc) ->
        return logger.error "Get devices failed: #{JSON.stringify(err)}" if err?
        developers = doc.developers
        logger.debug "Got #{developers.length} developers"
        for developer in developers
            do (developer) ->
                logger.debug "Got #{developer.devices.length} devices for developer #{developer.name}"
                for device in developer.devices
                    do (device) ->
                        logger.debug "Init device configuration #{developer.id}/#{device.id} - #{device.version.hardware}/#{device.version.firmware} for developer #{developer.name}"
                        dbPanstamp.get developer.id + device.id + device.version.hardware + device.version.firmware, (err, doc) ->
                            return logger.error "Get device #{developer.id + device.id + device.version.hardware + device.version.firmware} failed: #{JSON.stringify(err)}" if err?
                            device = doc
                            devicesConfig[device._id] = device
                            logger.info "Got device configuration #{device._id} for developer #{developer.name}"
        initDevices()

####################################################################################
#
####################################################################################
initDevices = () ->
    devices = {}
    dbPanstamp.view "domotix/devices", { }, (err, doc) ->
        for docDevices in doc
            devices["DEV" + swap.num2byte(docDevices.value.address)] = docDevices.value
            for level in levels
                for room in level.rooms
                    devices["DEV" + swap.num2byte(docDevices.value.address)].location.room = room if room.id == docDevices.value.location.room_id
        ss.api.publish.all swap.MQ.Type.SWAP_DEVICE

####################################################################################
#
####################################################################################
initSwapPacketsEvents = () ->
    swapPackets = []
    swapEvents = []
    options =
        include_docs: true
        limit: historicLength
        descending: true
    
    dbPanstampPackets.view "domotix/lastPackets", 
        limit: historicLength
        descending: true
        , (err, res) ->
            return logger.error "Get view domotix/lastPackets failed: #{JSON.stringify(err)}" if err?
            for row in res.rows
                swapPackets.push row.value
            ss.api.publish.all swap.MQ.Type.SWAP_PACKET
    
    dbPanstampEvents.view "domotix/lastEvents", 
        limit: historicLength
        descending: true
        , (err, res) ->
            return logger.error "Get view domotix/lastEvents failed: #{JSON.stringify(err)}" if err?
            for row in res.rows
                swapEvents.push row.value
            ss.api.publish.all swap.MQ.Type.SWAP_EVENT


####################################################################################
####################################################################################
# SETUP
####################################################################################
initLevels()

initSwapPacketsEvents()

serial = new SerialModem Config.serial
serial.on "started", () ->
    pubSub = new PubSub Config.broker
    state = new State Config, pubSub
    
    # Raw panstamp message (xxxx)yyyyyy
    serial.on swap.MQ.Type.SWAP_PACKET, (rawSwapPacket) ->
        if rawSwapPacket[0] is "("
            ccPacket = new swap.CCPacket rawSwapPacket[0 .. rawSwapPacket.length-1]  # remove \r
            if ccPacket.data
                swapPacket = new swap.SwapPacket ccPacket
                swapPacketReceived swapPacket
            else
                logger.warn "Unknown data received from Serial Bridge: #{rawSwapPacket} but must be a CCPacket"
        else
            logger.warn "Unknown data received from Serial Bridge: #{rawSwapPacket} but must be like '(xxxx)yyyyyy'"
    
    pubSub.on swap.MQ.Type.MANAGEMENT, (message) ->
        [client, type, data] = message.split ":"
        logger.debug "Management message: #{JSON.stringify(message)}"
        state.updateState swap.MQ.Type.CLIENTS, client, type, data
    
    pubSub.on swap.MQ.Type.SWAP_PACKET, (rawSwapPacket) ->
        ccPacket = new swap.CCPacket "(FFFF)" + rawSwapPacket.toString 'hex'
        if ccPacket.data
            swapPacket = new swap.SwapPacket ccPacket
            if swapPacket.func is swap.Functions.STATUS
                logger.warn "Status Packet received from MQ Bridge, not allowed"
            else
                serial.send swapPacket
                addSwapPacket swapPacket, undefined
    
# Only for dummy serial modem
serial.start() if Config.serial.dummy


####################################################################################
# Add SWAP Event to CouchDB and log it
####################################################################################
addSwapEvent = (swapEvent, swapDevice) ->
    swapEvent.time = moment().format('YYYY-MM-DDTHH:mm:ss.sssZ')
    
    dbPanstampEventsPool.addTask dbPanstampEvents.save, swapEvent.time, swapEvent, (err, doc) ->
        logger.error "Save SWAP event #{swapEvent.time} failed: #{JSON.stringify(err)}" if err?
    
    logger.warn "EVENT: #{swapEvent.topic} - #{swapEvent.text} @#{swapEvent.time}" if swapEvent.type is "warn"
    logger.info "EVENT: #{swapEvent.topic} - #{swapEvent.text} @#{swapEvent.time}" if swapEvent.type is "info"
    logger.error "EVENT: #{swapEvent.topic} - #{swapEvent.text} @#{swapEvent.time}" if swapEvent.type is "error"
    
    swapEvents.splice 0, 0, swapEvent
    swapEvents.pop() if swapEvents.length > historicLength
    ss.api.publish.all swap.MQ.Type.SWAP_EVENT, swapEvent


####################################################################################
# Add SWAP Packet to CouchDB
####################################################################################
addSwapPacket = (swapPacket, swapDevice, swapRegister) ->
    swapPacket.time = moment().format('YYYY-MM-DDTHH:mm:ss.sssZ')
    
    dbPanstampPacketsPool.addTask dbPanstampPackets.save, swapPacket.time, swapPacket, (err, doc) ->
        logger.error "Save SWAP packet #{swapPacket.time.time} failed: #{JSON.stringify(err)}" if err?
    
    swapPackets.splice 0, 0, swapPacket
    swapPackets.pop() if swapPackets.length > historicLength
    ss.api.publish.all swap.MQ.Type.SWAP_PACKET, swapPacket


####################################################################################
# Add SWAP Packet in queue for a SWAP Device
####################################################################################
addSwapPacketInQueue = (swapDevice, swapPacket) ->
    queuedSwapPackets = state.getState(swap.MQ.Type.SWAP_DEVICE)[swapDevice._id]
    queuedSwapPackets = new Array() if not queuedSwapPackets
    queuedSwapPackets.push swapPacket
    state.updateState swap.MQ.Type.SWAP_DEVICE, swapDevice._id, queuedSwapPackets


####################################################################################
# Sent queued SWAP Packet to SWAP Device
####################################################################################
sendQueuedSwapPackets = (swapDevice) ->
    queuedSwapPackets = state.getState(swap.MQ.Type.SWAP_DEVICE)[swapDevice._id]
    return if not queuedSwapPackets
    while (queuedSwapPacket = queuedSwapPackets.shift()) != null
        sendSwapPacket queuedSwapPackets


####################################################################################
# Update State
# Publish to SS
# Publish to MQ 
####################################################################################
sendToClient = (topics, swapPacket, swapDevice, swapRegister) ->
    
    topics = [topics] if not Array.isArray topics
    
    for topic in topics
        
        nonce = state.updateState topic, swapPacket.source, swapPacket
        
        ss.api.publish.all topic
        
        pubSub.publish topic, 
            nonce: nonce
            swapPacket: swapPacket
            swapDevice: swapDevice
            swapRegister: swapRegister


####################################################################################
# Update dest device for SWAP Packet value
####################################################################################
swapPacketReceived = (swapPacket) ->
    # Add device if not already seen
    swapDevice = undefined
    
    # Search for SWAP DEvice or create a new one if needed
    if ("DEV" + swap.num2byte(swapPacket.source)) not of devices
        text =  "Packet received from unknown source: #{swapPacket.source}"
        addSwapEvent
            type: "warn"
            topic: "unknownSwapswapDevice"
            text: text
        
        if swapPacket.func is swap.Functions.STATUS
            value = swapPacket.value
            if swapPacket.regId is swap.Registers.productCode.id
                newDevice.product.productCode = (swap.num2byte(v) for v in value).join("")
            else if swapPacket.regId is swap.Registers.hardwareVersion.id
                newDevice.product.hardware = (swap.num2byte(v) for v in value).join("")
            else if swapPacket.regId is swap.Registers.firmwareVersion.id
                newDevice.product.firmware = (swap.num2byte(v) for v in value).join("")
        
        if newDevice.product.productCode != "" && newDevice.product.hardware != "" && newDevice.product.firmware != ""
            productCode = newDevice.product.productCode + newDevice.product.hardware + newDevice.product.firmware
            if not devicesConfig[productCode]?
                addSwapEvent
                    type: "warn"
                    topic: "unknownDevice"
                    text: "Unknown device or manufacturer Id detected: #{productCode}"
            else
                swapDevice = devicesConfig[productCode]
                swapDevice.address = swapPacket.source
                swapDevice.networkId = Config.network.networkId
                swapDevice.frequencyChannel = Config.network.frequencyChannel
                swapDevice.product = productCode
                swapDevice.securityNonce = swapPacket.nonce
                swapDevice.lastStatusTime = swapPacket.time
                swapDevice.location =
                    room_id: -1
                    x: 0
                    dx: 0
                    y: 0
                    dy: 0
                    z: 0
                    dz: 0
                delete swapDevice._id
                delete swapDevice._rev
                
                # Add to the list before save in DB because packets may be received during saving
                devices["DEV" + swap.num2byte(swapDevice.address)] = swapDevice
                ss.api.publish.all swap.MQ.Type.SWAP_DEVICE
                
                addSwapEvent
                    type: "warn"
                    name: "newDevice"
                    text: "New device detected: #{swapDevice.productCode}, #{swapDevice.address}"
                
                dbPanstampPool.addTask dbPanstamp.save, "DEV" + swap.num2byte(swapDevice.address), swapDevice, (err, doc) ->
                    return logger.error "Save new device DEV#{swap.num2byte(swapDevice.address)} failed: #{JSON.stringify(err)}" if err?
                    swapDevice._id = doc._id
                    swapDevice._rev = doc._rev
                    #devices[doc._id] = swapDevice
                    addSwapEvent
                        type: "info"
                        name: "newSwapswapDeviceDetected"
                        text: "New swapDevice #{swapDevice.address} added: #{swapDevice.product.productCode} - #{devicesConfig[productCode].product} (#{devicesConfig[productCode].developer})"
                        swapDevice: swapDevice
                
        return
    else
        swapDevice = devices["DEV" + swap.num2byte(swapPacket.source)]
    
    # Handles STATUS packets
    if swapPacket.func is swap.Functions.STATUS
        value = swapPacket.value
        
        # handles missing packets ??
        if not Math.abs(swapDevice.securityNonce - swapPacket.nonce) in [1,255]
            addSwapEvent
                type: "warn"
                name: "missingNonce"
                text: "(#{swapDevice._id}): Missing nonce: got #{swapPacket.nonce} - expected #{swapDevice.securityNonce}"
                swapDevice: swapDevice
        
        swapDevice.securityNonce = swapPacket.nonce
        swapDevice.lastStatusTime = swapPacket.time
        
        if swapPacket.regId is swap.Registers.productCode.id
            # Nothing special to do 
            
        else if swapPacket.regId is swap.Registers.state.id
            swapDevice.systemState = swap.SwapStates.get value
            swapDevice.systemState = swapDevice.systemState.level
            
            if swapDevice.pwrdownmode
                sendQueuedSwapPackets swapDevice
            else
                addSwapEvent
                    type: "info"
                    topic: "systemState"
                    text: "(#{swapDevice._id}): State changed to #{swapDevice.systemState.str}"
                    swapDevice: swapDevice
        
        else if swapPacket.regId is swap.Registers.channel.id
            if swapDevice.frequencyChannel != value[0]
                swapDevice.frequencyChannel = value[0]
                addSwapEvent
                    type: "warn"
                    topic: "frequencyChannel"
                    text: "(#{swapDevice._id}): Channel changed to #{swapDevice.frequencyChannel}"
                    swapDevice: swapDevice
        
        else if swapPacket.regId is swap.Registers.security.id
            if swapDevice.securityOption = value[0]
                swapDevice.securityOption = value[0]
                addSwapEvent
                    type: "info"
                    topic: "securityOption"
                    text: "(#{swapDevice._id}): Security changed to #{swapDevice.securityOption}"
                    swapDevice: swapDevice
        
        else if swapPacket.regId is swap.Registers.password.id
            swapDevice.securityPassword = (swap.num2byte(v) for v in value).join("")
            addSwapEvent
                type: "info"
                topic: "securityPassword"
                text: "(#{swapDevice._id}): Password changed"
                swapDevice: swapDevice
        
        else if swapPacket.regId is swap.Registers.network.id
            value = 256 * value[0] + value[1]
            if swapDevice.networkId != value
                swapDevice.networkId = value
                addSwapEvent
                    type: "info"
                    topic: "network"
                    text: "(#{swapDevice._id}): Network changed to #{value}"
                    swapDevice: swapDevice
        
        else if swapPacket.regId is swap.Registers.address.id
            newAddress = value[0]
            oldAddress = swapDevice.address
            if oldAddress != newAddress  # may be due a QUERY request
                dbPanstamp.save "DEV" + swap.num2byte(newAddress), swapDevice, (err, doc) ->
                    return logger.error "Save device DEV#{swap.num2byte(newAddress)} failed: #{JSON.stringify(err)}" if err?
                    devices["DEV" + swap.num2byte(newAddress)] = swapDevice
                    addSwapEvent
                        type: "info"
                        topic: "address"
                        text: "(#{swapDevice._id}): Address changed from #{oldAddress} to #{newAddress}"
                        swapDevice: swapDevice
                        oldAddress: oldAddress
                    
                    cid = "DEV" + swap.num2byte(oldAddress)
                    dbPanstamp.remove cid, devices[cid]._rev, (err, res) ->
                        return logger.error "#{JSON.stringify(err)}" if err?
                        delete devices[cid]
                        return true
        
        else if swapPacket.regId is swap.Registers.txInterval.id
            value = 256 * value[0] + value[1]
            swapDevice.txInterval = value
            addSwapEvent
                type: "info"
                topic: "txInterval"
                text: "(#{swapDevice._id}): Transmit interval changed to #{value}"
                swapDevice: swapDevice
        
        # Retrieve value from endpoints definition
        else
            foundRegisters = (register for register in swapDevice.configRegisters when register.id == swapPacket.regId)
            if foundRegisters.length == 1
                foundRegister = foundRegisters[0]
                updateParamsValue swapDevice, foundRegister, swapPacket
                addSwapEvent
                    type: "info"
                    topic: "register"
                    text: "(#{swapDevice._id}): Register #{foundRegister.name} changed to #{value}"
                    swapDevice: swapDevice
            else
                foundRegisters = (register for register in swapDevice.regularRegisters when register.id == swapPacket.regId)
                if foundRegisters.length == 1
                    foundRegister = foundRegisters[0]
                    updateEndpointsValue swapDevice, foundRegister, swapPacket
                    addSwapEvent
                        type: "info"
                        topic: "register"
                        text: "(#{swapDevice._id}): Register #{foundRegister.name} changed to #{value}"
                        swapDevice: swapDevice
                else
                    addSwapEvent
                        type: "warn"
                        topic: "register"
                        text: "(#{swapDevice._id}): Unknown register #{swapPacket.regId}"
                        swapDevice: swapDevice
                    return
        
        dbPanstampPool.addTask dbPanstamp.save, "DEV" + swap.num2byte(swapDevice.address), swapDevice._rev, swapDevice, (err, res) ->
            return logger.error "Save device DEV#{swap.num2byte(swapDevice.address)}/#{swapDevice._rev} failed: #{JSON.stringify(err)}" if err?
            devices["DEV" + swap.num2byte(swapDevice.address)]._rev = res.rev
            ss.api.publish.all swap.MQ.Type.SWAP_DEVICE
    
    else if swapPacket.func is swap.Functions.QUERY
        logger.info "Query request received from #{swapPacketsource} for swapDevice #{swapPacketdest} register #{swapPacket.regId}"
    else if swapPacket.func is swap.Functions.COMMAND
        logger.info "Command request received from #{swapPacketsource} for swapDevice #{swapPacket.dest} register #{swapPacket.regId} with value #{swapPacket.value}"
    
    addSwapPacket swapPacket, swapDevice, foundRegister
    
####################################################################################
#
####################################################################################
updateEndpointsValue = (swapDevice, swapRegister, swapPacket) ->
    swapRegister.time = swapPacket.time
    swapRegister.value = if swapPacket.value.length is undefined then [swapPacket.value] else swapPacket.value
    
    if (swapDevice.product.indexOf swap.LightController.productCode) == 0
        if swapPacket.regId == swap.LightController.Registers.Outputs.id
            for light in lights
                do(light) ->
                    if light.swapDeviceAddress == swapDevice.address 
                        light.status = swapPacket.value[light.outputNb]
            sendToClient swap.MQ.Type.LIGHT_STATUS, swapPacket, swapDevice, swapRegister
        else if swapPacket.regId == swap.LightController.Registers.PressureTemperature.id
            swapRegister.pressure = swap.getPressure swapPacket
            swapRegister.temperature = swap.getTemperature swapPacket
            sendToClient [swap.MQ.Type.PRESSURE, swap.MQ.Type.TEMPERATURE], swapPacket, swapDevice, swapRegister
    else if (swapDevice.product.indexOf swap.LightSwitch.productCode) == 0
        if swapPacket.regId == swap.LightSwitch.Registers.Temperature.id
            swapRegister.temperature = swap.getTemperature swapPacket
            sendToClient swap.MQ.Type.TEMPERATURE, swapPacket, swapDevice, swapRegister

####################################################################################
#
####################################################################################
updateParamsValue = (swapDevice, swapRegister, swapPacket) ->
    swapRegister.time = swapPacket.time
    swapRegister.value = if swapPacket.value.length is undefined then [swapPacket.value] else swapPacket.value


####################################################################################
# Return TRUE if device must be saved in DB
# Return FALSE in case no update is required or update is handled by STATUS packet
####################################################################################
onUpdateDevice = (oldDevice, newDevice) ->
    if oldDevice.address = 255 and newDevice.address != 255
        sendSwapCommand oldDevice.address, swap.Registers.address, newDevice.address
        return false
    else if oldDevice.location != newDevice.location
        return true
    else
        return false


####################################################################################
# Gets the value of a specific register
####################################################################################
sendSwapQuery = (address, registerId) ->
    sendSwapPacket swap.Functions.QUERY, address, registerId, value


####################################################################################
# Sets the value of a specific register
####################################################################################
sendSwapCommand = (address, registerId, value) ->
    sendSwapPacket swap.Functions.COMMAND, address, registerId, value


####################################################################################
# Send a generic swap packet
####################################################################################
sendSwapPacket = (functionCode, address, registerId, value) ->
    swapPacket = new swap.SwapPacket()
    swapPacket.source = Config.network.address
    swapPacket.dest = address
    swapPacket.func = functionCode
    swapPacket.regAddress = address
    swapPacket.regId = registerId
    swapPacket.value = value
    
    if swapDevice.pwrdownmode
        addSwapPacketInQueue swapDevice, swapPacket
    else
        serial.send swapPacket
        addSwapPacket swapPacket


####################################################################################
#
####################################################################################
destroy = () ->
    pubSub.destroy


####################################################################################
# CLIENT SERVICES
####################################################################################
exports.actions = (req, res, ss) ->
    
    # Easily debug incoming requests here
    #console.log(req)
    
    getConfig: ->
        res Config
    
    updateConfig: (Config) ->
        @Config = Config
        res Config
    
    getDevices: ->
        res devices
    
    getLevels: ->
        res levels
    
    getLights: ->
        res lights
    
    getSwapPackets: ->
        res swapPackets
    
    getSwapEvents: ->
        res swapEvents
    
    getState: ->
        res state.getState()
    
    # Return clients state
    getClients: ->
        res state.getState swap.MQ.Type.CLIENTS
    
    # Return LightStatus register SWAP Packet for each ligt controler device
    getLightStatus: ->
        res state.getState swap.MQ.Type.LIGHT_STATUS
    
    # For each device, compute pressure in mbar from SWAP Packet
    getPressure: ->
        results = {}
        for device, swapPacket of state.getState swap.MQ.Type.PRESSURE
            results[device] = swap.getPressure swapPacket
        res results
    
    # For each device, compute temperature in °C from SWAP Packet
    getTemperature: ->
        results = {}
        for device, swapPacket of state.getState swap.MQ.Type.TEMPERATURE
            results[device] = swap.getTemperature swapPacket
        res results
    
    refreshDevices: ->
        initLevels()
        res true
    
    refreshState: ->
        logger.info "State before #{JSON.stringify(state.getState())}"
        state.init()
        logger.info "State after #{JSON.stringify(state.getState())}"
        res true
        
    refreshSwapPacketsEvents: ->
        initSwapPacketsEvents()
        res true
    
    updateDevice: (oldDevice, newDevice) ->
        # TODO: handle device update...
        if onUpdateDevice oldDevice, newDevice
          cid = "DEV" + swap.num2byte newDevice.address
          dbPanstamp.save cid, devices[cid]._rev, newDevice, (err, res) ->
              return logger.error "Save device #{cid}/#{devices[cid]._rev} failed: #{JSON.stringify(err)}" if err?
              newDevice._rev = res.rev
              devices[cid] = newDevice
              return true
        res true
    
    deleteDevice: (address) ->
        cid = "DEV" + swap.num2byte address
        dbPanstamp.remove cid, devices[cid]._rev, (err, res) ->
            return logger.error "Remove device #{cid}/#{devices[cid]._rev} failed: #{JSON.stringify(err)}" if err?
            delete devices[cid]
            return true
        res true
    
    # Gets the value of a specific register
    sendSwapQuery: (address, registerId) ->
        sendSwapQuery address, registerId
    
    # Sets the value of a specific register
    sendSwapCommand: (address, registerId, value) ->
        sendSwapCommand address, registerId, value
    
    # Send a generic swap packet
    sendSwapPacket: (functionCode, address, registerId, value) ->
        sendSwapPacket functionCode, address, registerId, value
    
    sendSwapEvent: (topic, data) ->
        addSwapEvent
            "topic": topic,
            "text": data
    
    checkNewDevices: () ->
        sendSwapQuery address, swap.Registers.productCode.id
    
    # Test serial reception
    onSerial: (str) ->
        data = "(0000)" + str
        swapPacket = new swap.CCPacket data
        swapPacket = new swap.SwapPacket swapPacket
        
        logger.info "OnSerial:"
        logger.info swapPacket
        
        swapPacketReceived swapPacket
        
        ss.publish.all "swapPacket", swapPacket
        swapPackets.splice(0, 0, swapPacket)
        swapPackets.pop() if swapPackets.length > 40
    
    # Delete document returned by a view    
    cleanByView: (view) ->
        logger.debug "Cleaning view #{view}..."
        dbPanstampPackets.view "domotix/" + view, { }, (err, res) ->
            return logger.error "#{JSON.stringify(err)}" if err?
            logger.debug "Removing document from view #{view}..."
            res.forEach (key, swapEvent, id) ->
                logger.debug "Removing document #{swapEvent._id} from view #{view}..."
                dbPanstampPackets.remove swapEvent._id, swapEvent._rev, (err, res) ->
                    return logger.error "Remove SWAP event #{swapEvent._id}/#{swapEvent._rev} failed: #{JSON.stringify(err)}" if err?
                    logger.info "#{swapEvent._id} deleted"
    
    createEvent: (event) ->
        event.dateTime = moment().format()
        dbEvents.save event, (err, doc) ->
            logger.error "Save event failed: #{JSON.stringify(err)}" if err?
        logger.info "#{event.type} - #{event.subtype} @#{event.time}"

