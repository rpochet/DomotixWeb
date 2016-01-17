var app = angular.module('app', ['ui.router', 'ui.bootstrap', 'ui.splash', 'domotix.filters', 'ngToast', 'angucomplete-alt', 'angularChart']);

var pingInterval = null;
var connectWebsocket = function(websocketService, wsUrl) {
  websocketService.init(wsUrl);
};

app.config(['ngToastProvider', function(ngToastProvider) {
    ngToastProvider.configure({
        dismissOnTimeout: false
    });
}]);

app.config(function ($stateProvider, $urlRouterProvider) {
  
  //Set default route
  $urlRouterProvider.otherwise('/');
 
  //Declare states
  $stateProvider
    .state('home', {
      url : '/',
      templateUrl: 'views/domotix.html',
      controller: 'DomotixCtrl'
    })
    .state('devices', {
      url : '/devices',
      templateUrl: 'views/devices.html',
      controller: 'DevicesCtrl'
    })
    .state('config', {
      url : '/config',
      templateUrl: 'views/config.html',
      controller: 'ConfigCtrl'
    })
    .state('network', {
      url : '/network',
      templateUrl: 'views/network.html',
      controller: 'NetworkCtrl'
    })
    .state('events', {
      url : '/events',
      templateUrl: 'views/events.html',
      controller: 'EventsCtrl'
    })
    .state('plugins', {
      url : '/plugins',
      templateUrl: 'views/plugins.html',
      controller: 'PluginsCtrl'
    })
    .state('admin', {
      url : '/admin',
      templateUrl: 'views/admin.html',
      controller: 'AdminCtrl'
    })
    //autres routes ...
    /*.state('admin', {
      url : '/admin/:matchId',
      templateUrl: 'views/admin.html',
      controller: 'AdminCtrl'
    })*/;
});

app.run(['$rootScope', '$window', '$splash', 'websocketService', 'ngToast', function($rootScope, $window, $splash, websocketService, ngToast) {
  var wsUrl = 'ws://' + $window.location.host;
  var $modalInstance;
  
  $rootScope.$on('websocket:ready', function() {
    $rootScope.refreshConfig();
    $rootScope.refreshLights();
    $rootScope.refreshLevels();
    $rootScope.refreshDevices();
    $rootScope.refreshState(true);
    
    if($modalInstance) {
      console.log('Connection back up :-)');
      $modalInstance.dismiss('cancel');
      $modalInstance = null;      
    }
    clearInterval(pingInterval);
  });
  
  $rootScope.$on('websocket:closed', function() {
    console.log('Connection down :-(');
    if($modalInstance == null) {
      $modalInstance = $splash.open({
        title: 'Hi there!',
        message: "This sure is a fine modal, isn't it?"
      });
      pingInterval = setInterval(function(websocketService, wsUrl) {
        ngToast.info({
            content: 'Connecting...'
        });
        connectWebsocket(websocketService, wsUrl);
      }, 10000, websocketService, wsUrl);
    }
  });
  
  setTimeout(function() {
    connectWebsocket(websocketService, wsUrl);
  });
}]); 

app.run(['$rootScope', 'websocketService', 'ngToast', function($rootScope, websocketService, ngToast) {
    var swap = isomorphic.swap;
      
    $rootScope.refreshDevices = function(force) {
      websocketService.rpc(force || false ? 'swapserver.refreshSwapDevices' : 'swapserver.getSwapDevices').then(function(devices) {
        /*ngToast.info({
            content: 'Got Swap Devices'
        });*/
        $rootScope.devices = devices;
      });
    };
    
    $rootScope.refreshConfig = function(force) {
      websocketService.rpc(force || false ? 'swapserver.refreshConfig' : 'swapserver.getConfig').then(function(config) {
        /*ngToast.info({
            content: 'Got config'
        });*/
        $rootScope.config = config;
      });
    };
    
    $rootScope.refreshState = function(force) {
      websocketService.rpc(force || false ? 'swapserver.refreshState' : 'swapserver.getState').then(function(state) {
        /*ngToast.info({
            content: 'Got state'
        });*/
        $rootScope.state = state;
      });
    };
      
    $rootScope.refreshLevels = function(force) {
      websocketService.rpc(force || false ? 'swapserver.refreshLevels' : 'swapserver.getLevels').then(function(levels) {
        /*ngToast.info({
            content: 'Got levels'
        });*/
        $rootScope.levels = levels;
        var rooms = new Array();
        levels.forEach(function(level) {
          level.rooms.forEach(function(room) {
            rooms.push(room);
          });
        });
        $rootScope.rooms = rooms;
      });
    };
      
    $rootScope.refreshLights = function(force) {
      websocketService.rpc(force || false ? 'swapserver.refreshLights' : 'swapserver.getLights').then(function(lights) {
        ngToast.info({
            content: 'Got lights',
            dismissOnTimeout: true
        });
        $rootScope.lights = lights;
        $rootScope.$broadcast(swap.MQ.Type.LIGHT_STATUS, lights);
      });
    };
      
    $rootScope.sendMessage = function(message) {      
      if(message.func == swap.Functions.COMMAND) {
        websocketService.rpc('swapserver.sendSwapCommand', message.address, message.register.id, swap.getValue(message.register.value || message.register.valueStr, message.register.length));
      } else if(message.func == swap.Functions.QUERY) {
        websocketService.rpc('swapserver.sendSwapQuery', message.address, message.register.id);
      } else {
        websocketService.rpc('swapserver.sendSwapPacket', message.func, message.address, message.register.id, swap.getValue(message.register.value || message.register.valueStr, message.register.length));        
      }
    };
    
    $rootScope.$on('swapDevice_updated', function() {
      $rootScope.refreshDevices();
    });
    
}]);