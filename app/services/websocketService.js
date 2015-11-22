app.factory('websocketService', ['$rootScope', '$q', function($rootScope, $q) {

    var _ws;
    var _sid = 0;
    var deferred = {};

    function onMessage(e) {
        var data = JSON.parse(decodeURIComponent(e.data));
        console.debug(data);
        if(data.type == 'rpc') {
            if(data.error) {
                deferred[data.sid].reject(data.error);
            } else {
                deferred[data.sid].resolve(data.return);
            }
            delete deferred[data.sid];
        } else if(data.type == 'event') {
            $rootScope.$broadcast(data.event, data.data);
        } else {
            $rootScope.$broadcast('websocket:message', data);
        }
    }

    return {

        init: function(url, protocol) {
            _ws = new WebSocket(url);
            _ws.onmessage = onMessage;
            _ws.onopen = function () {
            	$rootScope.$broadcast('websocket:ready');
            };
            _ws.onclose = function () {
            	$rootScope.$broadcast('websocket:closed');
            };
        },

        rpc: function() {
            var action = Array.prototype.shift.apply(arguments);
            deferred[++_sid] = $q.defer();
        	_ws.send(encodeURIComponent(JSON.stringify({ 
                type: 'rpc', 
                action: action,
                sid: _sid,
                parameters: Array.prototype.slice.call(arguments)
            })));
            return deferred[_sid].promise;
        },

        send: function(message) {
        	_ws.send(encodeURIComponent(JSON.stringify({ type: 'message', message: message })));
        }
        
    };

}]);