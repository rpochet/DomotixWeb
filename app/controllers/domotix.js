app.controller('DomotixCtrl', [ '$scope', 'websocketService', 'ngToast', function($scope, websocketService, ngToast) {
    var swap = isomorphic.swap;
    var defaultSize = 50;
    var defaultDistance = (defaultSize * 2) * (defaultSize * 2);  // 100
    
    /**
     * SDJ
     * 195/175 + 775/684 = 
     *  970/ 859: data
     *  911/ 807: event
     * 1126/1126: current target
     * 1200/1069: level
     * 
     *    0/1002:  lower-left corner
     *    0/   0:  upper-left corner
     * 1121/1002: lower-right corner
     * 1125/   0: upper-right corner
     */
    $scope.handleSvgClick = function($event, level) {
      var x = $event.offsetX / $event.currentTarget.clientWidth * level.width;
      var y = $event.offsetY / $event.currentTarget.clientHeight * level.height * 1.2;
      $scope.x = x;
      $scope.y = y;
      console.log(x + ' - ' + y);
      var minDistance = 1000000;
      var selectedLight = null;
      
      angular.forEach(level.rooms, function(room, idx) {
        angular.forEach(room.lights, function(light, idx) {
          var lightPosition = $scope.lightPosition(room, light);
          var r2 = ((x - lightPosition.x) * (x - lightPosition.x) + (y - lightPosition.y) * (y - lightPosition.y));
          console.log(light.name + ' - ' + r2);
          if(r2 < minDistance) {
            minDistance = r2;
            selectedLight = light;
          }
        });  
      });
      
      if (selectedLight && (minDistance < defaultDistance)) {
        ngToast.info({
          content: 'Click on ' + selectedLight.name,
          dismissOnTimeout: true
        });
        websocketService.rpc('swapserver.sendSwapPacket', 
          swap.LightController.Functions.Light, 
          selectedLight.swapDeviceAddress, 
          swap.LightController.Registers.Outputs.id, 
          [selectedLight.outputNb, swap.LightController.Values.Toggle]);
      }
    };
    
    $scope.devicePosition = function(device) {
      return [device.location.room.location.x + device.location.x, device.location.room.location.y + device.location.y];
    };
    
    $scope.lightPosition = function(room, light) {
      return {
        x: room.location.x + light.location.x + (light.layout ? light.layout.x || 0 : 0), 
        y: room.location.y + light.location.y + (light.layout ? light.layout.y || 0 : 0)
      };
    };
    
    $scope.lightDef = function(room, light) {
      if (light.layout.type === 'square') {
        return '#l2';
      } else {
        return '#l1';
      }
    };
    
    $scope.lightFill = function(room, light) {
      if (light.status === 0) {
        return 'url(' + $scope.lightDef(room, light) + '_off)';
      } else {
        return 'url(' + $scope.lightDef(room, light) + '_on)';
      }
    };
    
    $scope.lightTransform = function(room, light) {
      var lightPosition = $scope.lightPosition(room, light);
      var t = 'translate(' + lightPosition.x + ', ' + lightPosition.y + ')';
      t += ' scale(' + ((light.layout.r || defaultSize) / defaultSize) + ')';
      return t;
    };
    
    $scope.$on(swap.MQ.Type.SWAP_DEVICE, function(event, swapDevice) {
      websocketService.rpc('swapserver.getSwapDevices').then(function(devices) {
        $scope.devices = devices;
      });
    });
    
    $scope.$on(swap.MQ.Type.TEMPERATURE, function(event, temperature) {
      displayTemperature(temperature);
    });
    
    $scope.$on(swap.MQ.Type.PRESSURE, function(event, pressure) {
      displayPressure(pressure);
    });
    
    $scope.$on(swap.MQ.Type.LIGHT_STATUS, function(event, lightStatus) {
      if(lightStatus) {
        //$scope.$apply(function() {
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
        //});
      }
    });
    
    var displayTemperature = function(temperature) {
      angular.forEach(temperature, function(temperature, devAddr) {
          $scope.devices['DEV' + swap.num2byte(devAddr)].temperature = temperature;
      });
    };
    
    var displayPressure = function(pressure) {
      angular.forEach(pressure, function(pressure, devAddr) {
          $scope.devices['DEV' + swap.num2byte(devAddr)].pressure = pressure;
      });
    };
    
    var displayTemperaturePressure = function() {
      websocketService.rpc('swapserver.getTemperature').then(function(temperature) {
        ngToast.info({
          content: 'Got temperature'
        });
        displayTemperature(temperature);
      });
      websocketService.rpc('swapserver.getPressure').then(function(pressure) {
        ngToast.info({
          content: 'Got pressure'
        });
        displayPressure(pressure);
      });
    };
  }
]);

