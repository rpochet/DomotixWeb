exports.id = 'state';
exports.version = '1.0.0';

var DATABASE_NAME  = 'domotix';
var STATE_DOCUMENT_NAME = 'state';
var $q = require('q');
var util = require('util');

/**
    Get state
    return {State}
*/
exports.getState = function() {
    var deferred = $q.defer();
    DATABASE(DATABASE_NAME).get(STATE_DOCUMENT_NAME, function(error, doc) {
        if(error) {
            deferred.reject(new Error(error));
        } else {
            deferred.resolve(doc);
        }
    });
    return deferred.promise;
};

/**
    Update state
    @state {State}
    return {State}
*/
exports.updateState = function(state) {
    var deferred = $q.defer();
    DATABASE(DATABASE_NAME).save(state._id, state._rev, state, function(error, doc) {
        if(error) {
            deferred.reject(new Error(error));
        } else {
            var state = doc;
            deferred.resolve(state);
        }
    });
    return deferred.promise;
};