exports.id = 'house';
exports.version = '1.0.0';

var DATABASE_NAME  = 'domotix';
var LEVELS_VIEW_NAMESPACE = 'domotix';
var LEVELS_VIEW_NAME = 'levels';
//var LIGHTS_DOCUMENT_NAME = 'lights';
var $q = require('q');
var util = require('util');


/**
    Get all levels
    return {SwapDevice}
*/
exports.getLevels = function() {
    var deferred = $q.defer();
    DATABASE(DATABASE_NAME).view(LEVELS_VIEW_NAMESPACE + "/" + LEVELS_VIEW_NAME, function(error, res) {
        if(error) {
            deferred.reject(new Error(error));
        } else {
            var ret = new Array();
            res.forEach(function(row) {
                ret.push(row);
            });
            deferred.resolve(ret);
        }
    });
    return deferred.promise;
};


/**
    Get all lights
    return {SwapDevice}
*/
/*exports.getLights = function() {
    var deferred = $q.defer();
    DATABASE(DATABASE_NAME).get(LIGHTS_DOCUMENT_NAME, function(error, res) {
        if(error) {
            deferred.reject(new Error(error));
        } else {
            deferred.resolve(res.lights);
        }
    });
    return deferred.promise;
};*/

exports.clearCache = function() {
    var db = DATABASE(DATABASE_NAME);
    db.clearCache.apply(db, arguments);
};