var app = angular.module('app', ['ui.router', 'ui.bootstrap', 'domotix.filters', 'ngToast', 'angucomplete-alt']);

var pingInterval = null;
var connectWebsocket = function(websocketService, wsUrl) {
  websocketService.init(wsUrl);
};

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

app.run(function($rootScope, $window, $uibModal, websocketService) {
  var wsUrl = 'ws://' + $window.location.host;
   
  $rootScope.$on('websocket:ready', function() {
    $rootScope.refreshConfig();
    $rootScope.refreshLights();
    $rootScope.refreshLevels();
    $rootScope.refreshDevices();
    $rootScope.refreshState(true);
    
    console.log('Connection back up :-)');
    //$('#warning').modal('hide')
    clearInterval(pingInterval);
  });
  
  $rootScope.$on('websocket:closed', function() {
    console.log('Connection down :-(');
    //$('#warning').modal('show');
    pingInterval = setInterval(function(websocketService, wsUrl) {
      connectWebsocket(websocketService, wsUrl);
    }, 10000, websocketService, wsUrl);
  });
  
  setTimeout(function() {
    connectWebsocket(websocketService, wsUrl);
  });
}); 

app.run(function($rootScope, websocketService) {
    $rootScope.refreshDevices = function(force) {
      websocketService.rpc(force || false ? 'swapserver.refreshSwapDevices' : 'swapserver.getSwapDevices').then(function(devices) {
        return $rootScope.devices = devices;
      });
    };
    
    $rootScope.refreshConfig = function(force) {
      websocketService.rpc(force || false ? 'swapserver.refreshConfig' : 'swapserver.getConfig').then(function(config) {
        return $rootScope.config = config;
      });
    };
    
    $rootScope.refreshState = function(force) {
      websocketService.rpc(force || false ? 'swapserver.refreshState' : 'swapserver.getState').then(function(state) {
        return $rootScope.state = state;
      });
    };
      
    $rootScope.refreshLevels = function(force) {
      websocketService.rpc(force || false ? 'swapserver.refreshLevels' : 'swapserver.getLevels').then(function(levels) {
        return $rootScope.levels = levels;
      });
    };
      
    $rootScope.refreshLights = function(force) {
      websocketService.rpc(force || false ? 'swapserver.refreshLights' : 'swapserver.getLights').then(function(lights) {
        return $rootScope.lights = lights;
      });
    };
      
    $rootScope.refreshState = function(force) {
      websocketService.rpc(force || false ? 'swapserver.refreshState' : 'swapserver.getState').then(function(state) {
        return $rootScope.state = state;
      });
    };
    
    $rootScope.sendMessage = function(message) {      
      var swap = isomorphic.swap;
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
    
});