var util = require('util');
var querystring = require('querystring');
var auth = require('basic-auth');

//================================================
//AUTHORIZATION
//================================================

F.onAuthorization = function(req, res, flags, callback) {

	F.log('Authorise request: ', req.uri);
	
    var credentials = auth(req);
    if (util.isNullOrUndefined(credentials)) {
        res.statusCode = 401;
        res.setHeader('WWW-Authenticate', 'Basic realm="example"');
        res.throw401('Basic realm="example"');
        callback(false);
        return;
    }
    
    var user = {};
    user.principal = credentials.name;
    callback(true, user);
}


F.onValidation = function(name, value) {
    switch (name) {
        case 'LoginName':
            return U.isEmail(value);
        case 'LoginPassword':
            return value.length > 0;
    };
}