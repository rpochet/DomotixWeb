var cradle = require('cradle');
var util = require('util');
var config = F.global.Config;
var poolr  = require("poolr").createPool;
var dbURL = "http://" + config.couchDB.host + ":" + config.couchDB.port;
var db = new(cradle.Connection)(dbURL);
var cache = {};
console.log('CouchDB url is ' + dbURL);

F.database = function(name) {
  var cached = cache[name];
  if(cached === undefined) {
    cached = new PoolrCradle(db.database(name));
    cache[name] = cached;
  }
	return cached
};

function PoolrCradle(db) {
  // always initialize all instance properties
  this.db = db;
  this.pool = poolr(1, db);
  this.pool.on('throttle', function() {
    console.log(util.format('%s throttle', this.ctx.name));
  });
  this.pool.on('drain', function() {
    console.log(util.format('%s drain', this.ctx.name));
  });
  this.pool.on('last', function() {
    console.log(util.format('%s last', this.ctx.name));
  });
  this.pool.on('idle', function() {
    console.log(util.format('%s idle', this.ctx.name));
  });
}

// class methods
PoolrCradle.prototype.view = function() {
  var args = Array.prototype.slice.call(arguments);
  args.unshift(this.db.view);
  this.pool.addTask.apply(this.pool, args);
};
PoolrCradle.prototype.get = function() {
  var args = Array.prototype.slice.call(arguments);
  args.unshift(this.db.get);
  this.pool.addTask.apply(this.pool, args);
};
PoolrCradle.prototype.one = function() {
  var args = Array.prototype.slice.call(arguments);
  args.unshift(this.db.one);
  this.pool.addTask.apply(this.pool, args);
};
PoolrCradle.prototype.save = function() {
  var args = Array.prototype.slice.call(arguments);
  args.unshift(this.db.save);
  this.pool.addTask.apply(this.pool, args);
};
PoolrCradle.prototype.remove = function() {
  var args = Array.prototype.slice.call(arguments);
  args.unshift(this.db.remove);
  this.pool.addTask.apply(this.pool, args);
};