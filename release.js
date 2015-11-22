// ===================================================
// IMPORTANT: only for production
// total.js - web application framework for node.js
// http://www.totaljs.com
// ===================================================

var fs = require('fs');
var yaml_config = require('node-yaml-config');
var config = yaml_config.load(__dirname + '/configs/default.yaml');

var log4js = require("log4js")
log4js.configure('configs/log4js_configuration.json', { reloadSecs: 300 });
var logger = log4js.getLogger(__filename.split("/").pop(-1).split(".")[0]);

// options.ip = '127.0.0.1';
// options.port = parseInt(process.argv[2]);
// options.config = { name: 'total.js' };
// options.https = { key: fs.readFileSync('keys/agent2-key.pem'), cert: fs.readFileSync('keys/agent2-cert.pem')};
// options.sleep = 2000;

	
/**
 * Release notes:
 */

var options = {};
options.ip = config.server.host;
options.port = config.server.port;

var framework = require('total.js');
framework.global.Config = config;

framework.on('load', function() {
	logger.info('Server started');
	//this.mail('pochet.romuald@gmail.com', 'INIT', 'email', { message: 'init' });
});

framework.on('problem', function(message, name, uri, ip) {
	logger.error('Problem: %s. %s/%s/%s', message, name, uri.href, ip);
	//this.mail('pochet.romuald@gmail.com', 'PROBLEM: ' + message, 'email', { message: message, name: name, uri: uri, ip: ip });
});

framework.http('development', options);

// require('total.js').https('release', options);