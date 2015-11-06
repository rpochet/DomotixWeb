exports.install = function() {
    F.restful('/swapDevices/', action_query, action_read, action_save, action_remove);
}

function action_query() {
    
}

function action_read(swapDeviceId) {
    
    var swapDevice = MODEL('devices').getSwapDevice(swapDeviceId);
    
    this.json(swapDevice);
}

function action_save(swapDeviceId, swapDevice) {
    
    MODEL('devices').updateSwapDevice(swapDevice);
    
    this.json(swapDevice);
}

function action_remove(swapDeviceId) {
    
}
