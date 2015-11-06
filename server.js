var http = require('http');
var url = require('url');
var auth = require('basic-auth');

http.createServer(function(request, response) {
  console.log(request);
  console.log(auth(request));
  
  var srvUrl = url.parse('http://' + request.url);
  console.log(srvUrl);
  
  response.writeHead(200, {'Content-Type': 'text/plain'});
  response.end('okay');
}).listen(9090);

function callback(error, response, body) {
  console.log(body);
}

http.request('http://rpochet:rpochet@localhost:9090/request', callback).end();

http.request({
  'port': 9090,
  'auth': 'rpochet:rpochet'
}, callback).end();

