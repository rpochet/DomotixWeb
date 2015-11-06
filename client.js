var http = require('http');
var url = require('url');

function callback(error, response, body) {
  console.log(body);
}

http.request('http://rpochet:rpochet@localhost:8080/', callback).end();

http.request({
  'host': 'localhost',
  'port': 8080,
  'auth': 'rpochet:rpochet'
}, callback).end();

