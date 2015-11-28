exports.id = 'packets';
exports.version = '1.01';

var DATABASE_NAME  = 'panstamp_packets';
var $q = require('q');
var util = require('util');
var moment = require("moment");

/**
    Get SWAP Packet
    return {SwapPacket}
*/
exports.getSwapPacket = function() {
    var deferred = $q.defer();
    /*DATABASE(DATABASE_NAME).get(STATE_DOCUMENT_NAME, function(error, doc) {
        if(error) {
            deferred.reject(new Error(error));
        } else {
            deferred.resolve(doc);
        }
    });*/
    return deferred.promise;
};

/**
    Update swapPacket
    @state {SwapPacket}
    return {SwapPacket}
*/
exports.saveSwapPacket = function(swapPacket) {
    var deferred = $q.defer();
    swapPacket.time = moment().format('YYYY-MM-DDTHH:mm:ss.SSSZ');
    DATABASE(DATABASE_NAME).save(swapPacket.time, swapPacket, function(error, doc) {
        if(error) {
            deferred.reject(new Error(error));
        } else {
            swapPacket._rev = doc._rev;
            deferred.resolve(swapPacket);
        }
    });
    return deferred.promise;
};