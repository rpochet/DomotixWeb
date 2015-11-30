exports.id = 'devices';
exports.version = '1.0.0';

var DATABASE_NAME  = 'domotix';
var DEVICES_VIEW_NAMESPACE = 'domotix';
var DEVICES_VIEW_NAME = 'devices';
var $q = require('q');
var util = require('util');

/**
    Get a SWAP device
    @id {String} DEVxx
    return {SwapDevice}
*/
exports.getSwapDevice = function(id) {
    var deferred = $q.defer();
    DATABASE(DATABASE_NAME).one(id, function(error, doc) {
        if(error) {
            deferred.reject(new Error(error));
        } else {
            deferred.resolve(doc);
        }
    });
    return deferred.promise;
};

/**
    Get all SWAP device
    return {SwapDevice}
*/
exports.getSwapDevices = function() {
    var deferred = $q.defer();
    DATABASE(DATABASE_NAME).view(DEVICES_VIEW_NAMESPACE + "/" + DEVICES_VIEW_NAME, function(error, res) {
        if(error) {
            deferred.reject(new Error(error.error + ': ' + error.reasonror));
        } else {
            var ret = {};
            res.json.rows.forEach(function(row) {
                ret[row.id] = row.value;
            }, this);
            deferred.resolve(ret);
        }
    });
    return deferred.promise;
};
    
/**
    Create a SWAP device
    @swapDevice {SwapDevice} DEVxx
    return {SwapDevice}
*/
exports.createSwapDevice = function(swapDevice) {
    var deferred = $q.defer();
    DATABASE(DATABASE_NAME).save(swapDevice._id, swapDevice, function(error, doc) {
        if(error) {
            deferred.reject(new Error(error.error + ': ' + error.reason));
        } else {
            swapDevice._rev = doc._rev;
            deferred.resolve(swapDevice);
        }
    });
    return deferred.promise;
};

/**
    Update a SWAP device
    @swapDevice {SwapDevice} DEVxx
    return {SwapDevice}
*/
exports.updateSwapDevice = function(swapDevice) {
    var deferred = $q.defer();
    DATABASE(DATABASE_NAME).save(swapDevice._id, swapDevice._rev, swapDevice, function(error, doc) {
        if(error) {
            deferred.reject(new Error(error.error + ': ' + error.reason));
        } else {
            swapDevice._rev = doc._rev;
            deferred.resolve(swapDevice);
        }
    });
    return deferred.promise;
};

/**
    Delete a SWAP device
    @swapDevice {SwapDevice} DEVxx
    return {SwapDevice}
*/
exports.deleteSwapDevice = function(swapDevice) {
    var deferred = $q.defer();
    DATABASE(DATABASE_NAME).remove(swapDevice._id, swapDevice._rev, function(error, doc) {
        if(error) {
            deferred.reject(new Error(error.error + ': ' + error.reason));
        } else {
            swapDevice._rev = doc._rev;
            deferred.resolve(swapDevice);
        }
    });
    return deferred.promise;
}
