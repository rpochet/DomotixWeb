app.controller('DomotixCtrl', [
  '$scope', 'websocketService', function($scope, websocketService) {
    var swap = isomorphic.swap;
    var displayPressure, displayTemperature, displayTemperaturePressure;
    
    $scope.handleSvgClick = function($event, level) {
      var x = $event.offsetX / $event.currentTarget.clientWidth * level.width;
      var y = $event.offsetY / $event.currentTarget.clientHeight * level.height;
      angular.forEach(level.rooms, function(room, idx) {
        angular.forEach(room.lights, function(light, idx) {
          var pos = $scope.lightPosition(room, light);
          if (((x - pos[0]) * (x - pos[0]) + (y - pos[1]) * (y - pos[1])) < 10000) {
            return websocketService.rpc('swapserver.sendSwapPacket', 
              swap.LightController.Functions.Light, 
              light.swapDeviceAddress, 
              swap.LightController.Registers.Outputs.id, 
              [light.outputNb, swap.LightController.Values.Toggle]);
          }
        });  
      });
    };
    
    $scope.devicePosition = function(device) {
      return [device.location.room.location.x + device.location.x, device.location.room.location.y + device.location.y];
    };
    
    $scope.lightPosition = function(room, light) {
      return [room.location.x + light.location.x, room.location.y + light.location.y];
    };
    
    $scope.lightDef = function(room, light) {
      if (light.status === 0) {
        return '#r1';
      } else {
        return '#r2';
      }
    };
    
    $scope.lightFill = function(room, light) {
      if (light.status === 0) {
        return 'url(#g1)';
      } else {
        return 'url(#g2)';
      }
    };
    
    $scope.$on(swap.MQ.Type.SWAP_DEVICE, function(event, swapDevice) {
      websocketService.rpc('swapserver.getSwapDevices').then(function(devices) {
        return $scope.devices = devices;
      });
    });
    
    $scope.$on(swap.MQ.Type.TEMPERATURE, function(event, temperature) {
      return displayTemperature(temperature);
    });
    
    $scope.$on(swap.MQ.Type.PRESSURE, function(event, pressure) {
      return displayPressure(pressure);
    });
    
    $scope.$on(swap.MQ.Type.LIGHT_STATUS, function(event, lightStatus) {
      $scope.$apply(function() {
        angular.forEach($scope.levels, function(level) {
          angular.forEach(level.rooms, function(room) {
            angular.forEach(room.lights, function(light) {
              if (lightStatus[light.swapDeviceAddress]) {
                light.status = lightStatus[light.swapDeviceAddress].value[light.outputNb];
                return;
              }
            });
          });
        });
      });
    });
    
    displayTemperature = function(temperature) {
      angular.forEach(temperature, function(temperature, devAddr) {
          $scope.devices['DEV' + swap.num2byte(devAddr)].temperature = temperature;
      });
    };
    
    displayPressure = function(pressure) {
      angular.forEach(pressure, function(pressure, devAddr) {
          $scope.devices['DEV' + swap.num2byte(devAddr)].pressure = pressure;
      });
    };
    
    displayTemperaturePressure = function() {
      return websocketService.rpc('swapserver.getTemperature').then(function(temperature) {
        displayTemperature(temperature);
      });
      return websocketService.rpc('swapserver.getPressure').then(function(pressure) {
        displayPressure(pressure);
      });
    };
  }
]);

