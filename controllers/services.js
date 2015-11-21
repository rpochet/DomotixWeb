var swap = isomorphic.swap;

exports.install = function() {
    F.route('/ws', message_http, ['json', 'authorize']);
    F.websocket('/', message_webSocket, ['json']);
};

var users = {};

/**
 * this: FrameworkController
 */
function message_http() {

    var self = this;
    
    var message = self.body;
    
    var refresh = function() {
        var users = [];

        users.each(function(client) {
            if (client.alias) {
                users.push(client.alias);
            }
        });

        self.send({ type: 'users', message: users });
    };

    if (message.type === 'change') {
        client.alias = message.message;
        refresh();
        return;
    }

    self.json({ user: client.alias, type: 'message', message: message.message, date: new Date() });

    self.on('close', function(client) {
        refresh();
    });
}

/**
 * this: WebSocket connection
 */
function message_webSocket(user) {

    var connection = this;

    connection.on('open', function(websocketClient) {
        var principal = websocketClient.user.principal;
        var client = users[principal];
        if(client === undefined) {
            client = websocketClient;
            users[principal] = client;
        }
        client.isOpen = true;
        websocketClient.send({ type: 'message', message: 'Welcome ' + client.user.principal });
    });
    
    connection.on('message', function(websocketClient, message) {
        if(message.type == 'rpc') {
            var action = message.action.split('.');
            var object = SOURCE(action[0]);
            if(object) { 
                var method = object[action[1]];
                if(method) { 
                    if(method.then) {
                        method.apply(object, message.parameters)
                            .then(function(results) {
                                sendMessage(connection, message, results);
                            }, function(reason) {
                                sendMessage(connection, message, null, reason);
                            });
                    } else {
                        sendMessage(websocketClient, message, method.apply(object, message.parameters));
                    }
                } else {
                    sendMessage(websocketClient, message, null, 'Method ' + action[1] + ' does not exist for object ' + action[0]);
                }
            } else {
                sendMessage(websocketClient, message, null, 'Object ' + action[0] + ' does not exist');
            }
        } else {
            F.emit('websocket:' + message.type, message);
        }
    });

    connection.on('close', function(websocketClient) {
        users[websocketClient.user.principal].isOpen = false;
    });

    F.on(swap.MQ.Type._ALL, function(event, data) {
        var message = {};
        message.type = "event";
        message.event = event;
        sendMessage(connection, message, data);
    });
}

function sendMessage(websocketClient, message, results, error) {
    message.return = results;
    message.error = error;
    message.date = new Date();
    websocketClient.send(message);
}