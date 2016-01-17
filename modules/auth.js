// MIT License
// Copyright Peter Širka <petersirka@gmail.com>
// Version 1.02

var events = require('events');
var util = require('util');
var basicAuth = require('basic-auth');

var SUGAR = 'AtH101s84';
var USERAGENT = 20;

// expireCookie in days
// expireSession in minutes

function Users() {
    this.options = { cookie: '__user', secret: 'a4e13bCbb9', expireSession: 10, expireCookie: 10, autoLogin: true };
    this.online = 0;
    this.users = {};
}

Users.prototype = new events.EventEmitter;

/*
    Authorize user
    @id {Number}
    @callback {Function} :: callback must have as parameter an object or null value
*/
Users.prototype.onAuthorization = null;

Users.prototype.usage = function() {
    return { online: this.online };
};

Users.prototype._onAuthorization = function(req, res, flags, callback) {

    var self = this;
    var options = self.options;
    var cookie = req.cookie(options.cookie) || '';
    var credentials = basicAuth(req);
    var id = undefined;
    
    if (!util.isNullOrUndefined(cookie) && cookie.length > 0) {
        id = cookie;
    } else if (!util.isNullOrUndefined(credentials)) {
        id = credentials.name;
    } else {
        res.statusCode = 401;
        if(res.setHeader) {
            res.setHeader('WWW-Authenticate', 'Basic realm="Domotix"');
        }
        if(res.throw401) {            
            res.throw401('Basic realm="Domotix"');
        }
        callback(false);
        return;
    }

    var user = self.users[id];
    if (!user) {
        user = {};
        self.users[id] = user;
    }

    //self.users[id].expire = new Date().add('m', self.options.expireSession);
    
    req.user = user;
    
    //self._writeOK(id, controller.req, controller.res);
    res.cookie(self.options.cookie, id, new Date().add('y', 1));
    
    self.emit('login', id, user);
    //self.refresh();
    callback(true);
};

/*
    Login an user
    @controller {Controller}
    @id {Number}
    @user {Object}
    @expire {Number} :: expire in minutes
    return {Users}
*/
/*Users.prototype.login = function(controller, id, user, expire) {

    id = id.toString();

    var self = this;

    if (typeof(expire) !== 'number')
        expire = null;


    self.users[id] = { user: user, expire: utils.isDate(expire) ? expire : new Date().add('m', expire || self.options.expireSession).getTime() };
    self.refresh();
    self.emit('login', id, user);
    self._writeOK(id, controller.req, controller.res);

    return self;
};*/

/*
    Logoff an user
    @controller {Controller}
    @id {Number}
    return {Users}
*/
/*Users.prototype.logoff = function(controller, id) {

    id = id.toString();

    var self = this;
    var user = self.users[id];

    delete self.users[id];
    self._writeNO(controller.res);

    self.refresh();
    self.emit('logoff', id, user || null);

    return self;
};*/

/*
    Change an user
    @id {Number}
    @newUser {Object}
    return {Users}
*/
/*Users.prototype.change = function(id, newUser, expire) {

    id = id.toString();

    var self = this;
    var old = self.users[id] || null;

    if (old === null)
        return self;

    self.users[id].user = newUser;
    self.emit('change', id, newUser, old);

    return self;
};*/

/*
    Update an user
    @id {Number}
    @fn {function}
    return {Users}
*/
/*Users.prototype.update = function(id, fn) {

    id = id.toString();

    var self = this;
    var old = self.users[id] || null;

    if (old === null)
        return null;

    var tmp = fn(old);

    if (tmp)
        self.users[id] = tmp;

    self.emit('update', id, old);

    return self;
};*/

/*
    Set Expires
    @id {Number}
    @expire {Date}
    return {Users}
*/
/*Users.prototype.setExpires = function(id, expire) {
    id = id.toString();

    var self = this;
    var old = self.users[id] || null;

    if (old === null)
        return self;

    self.users[id].expire = utils.isDate(expire) ? expire : new Date().add('m', expire || self.options.expireSession).getTime();
    return self;
};*/

/*
    Internal
*/
/*Users.prototype.refresh = function() {
    var self = this;
    var keys = Object.keys(self.users);

    self.online = keys.length;
    self.emit('online', self.users);

    return self;
};*/

/*
    Internal
*/
/*Users.prototype.recycle = function() {

    var self = this;
    var keys = Object.keys(self.users);
    var length = keys.length;

    if (length === 0)
        return self;

    var expire = new Date();
    var users = self.users;

    for (var i = 0; i < length; i++) {
        var key = keys[i];
        var user = users[key];
        if (user.expire < expire) {
            self.emit('expire', key, user.user);
            delete users[key];
        }
    }

    self.refresh();
    return self;
};*/

/*
    Internal
*/
/*Users.prototype._writeOK = function(id, req, res) {
    var self = this;
    var value = id + '|' + SUGAR + '|' + req.headers['user-agent'].substring(0, USERAGENT).replace(/\s/g, '') + '|' + req.ip + '|';
    res.cookie(self.options.cookie, framework.encrypt(value, self.options.secret), new Date().add('d', self.options.expireCookie));
    return this;
};*/

/*
    Internal
*/
/*Users.prototype._writeNO = function(res) {
    var self = this;
    res.cookie(self.options.cookie, '', new Date().add('y', -1));
    return self;
};*/

var users = new Users();
module.exports = users;
module.exports.name = module.exports.id = 'auth';
module.exports.version = '1.01';

/*function service(counter) {
    // Each 3 minutes
    if (counter % 3 === 0)
        users.recycle();
}*/

function authorization(req, res, flags, callback) {

    if (users._onAuthorization !== null) {
        users._onAuthorization(req, res, flags, callback);
        return;
    }

    callback(false);
}

module.exports.install = function() {

    // Backward compatibility
    var options = framework.version >= 1900 ? arguments[0] : arguments[1];

    //SUGAR = (framework.config.name + framework.config.version + SUGAR).replace(/\s/g, '');

    framework.onAuthorize = authorization;
    /*framework.on('service', service);

    if (options)
        users.options = Utils.copy(options);

    this.emit('auth', users);*/
};

module.exports.uninstall = function() {
    if (framework.onAuthorize === authorization)
        framework.onAuthorize = null;
    //framework.removeListener('service', service);
};