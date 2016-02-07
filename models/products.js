exports.id = 'products';
exports.version = '1.0.0';

var DATABASE_NAME  = 'domotix';
var PRODUCTS_VIEW_NAMESPACE = 'domotix';
var PRODUCTS_VIEW_NAME = 'products';
var $q = require('q');
var util = require('util');

/**
    Get all SWAP product
    return {SwapProduct}
*/
exports.getSwapProducts = function() {
    var deferred = $q.defer();
    DATABASE(DATABASE_NAME).view(PRODUCTS_VIEW_NAMESPACE + "/" + PRODUCTS_VIEW_NAME, function(error, res) {
        if(error) {
            deferred.reject(new Error(error));
        } else {
            var options = {
                "include_docs": true,
                "keys": new Array()
            };
            res.forEach(function(element) {
                options.keys.push(element.key);
            }, this);
            DATABASE(DATABASE_NAME).get(options.keys, function(error, res) {
                var ret = {};
                res.forEach(function(row) {
                    ret[row._id] = row;
                }, this);
                deferred.resolve(ret);
            });
        }
    });
    return deferred.promise;
};

exports.getSwapDeviceFirmare = function(firmareId) {
    var deferred = $q.defer();
    DATABASE(DATABASE_NAME).get(firmareId, function(error, doc) {
        if(error) {
            deferred.reject(new Error(error));
        } else {
            deferred.resolve(doc);
        }
    });
    return deferred.promise;
}