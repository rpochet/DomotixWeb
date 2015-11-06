// ===================================================
// IMPORTANT: only for production
// total.js - web application framework for node.js
// http://www.totaljs.com
// ===================================================

var fs = require('fs');
var yaml_config = require('node-yaml-config');
var config = yaml_config.load(__dirname + '/configs/default.yaml');

// options.ip = '127.0.0.1';
// options.port = parseInt(process.argv[2]);
// options.config = { name: 'total.js' };
// options.https = { key: fs.readFileSync('keys/agent2-key.pem'), cert: fs.readFileSync('keys/agent2-cert.pem')};
// options.sleep = 2000;

	
/**
 * Release notes:
 */

var options = {};
options.port = config.server.port;

var framework = require('total.js');
framework.global.Config = config;
framework.on('', function() {
	this.mail('pochet.romuald@gmail.com', 'Test e-mail', '~email', { name: 'MODEL NAME' });
});
framework.http('debug', options);

// require('total.js').https('release', options);