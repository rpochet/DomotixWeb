app.controller('DomotixCtrl', [ '$scope', 'websocketService', 'ngToast', function($scope, websocketService, ngToast) {
    var swap = isomorphic.swap;
    
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
      var y = $event.offsetY / $event.currentTarget.clientHeight * level.height;
      $scope.x = x;
      $scope.y = y;
      $scope.r2 = 0;
      
      angular.forEach(level.rooms, function(room, idx) {
        angular.forEach(room.lights, function(light, idx) {
          var pos = $scope.lightPosition(room, light);
          var r2 = ((x - pos[0]) * (x - pos[0]) + (y - pos[1]) * (y - pos[1]));
          $scope.r2 = r2;
          if (r2 < 10000) { // 100
            ngToast.info({
              content: 'Click on ' + light.name,
              dismissOnTimeout: true
            });
            websocketService.rpc('swapserver.sendSwapPacket', 
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
      /*if (light.layout.type === 'square') {
        return '#l2';
      } else {*/
        return '#l1';
      //}
    };
    
    $scope.lightFill = function(room, light) {
      if (light.status === 0) {
        return 'url(#g1)';
      } else {
        return 'url(#g2)';
      }
    };
    
    $scope.lightTransform = function(room, light) {
      /*if (light.layout.type === 'circle') {
        return 'scale(' + ((light.layout.r || 50) / 50) + ')';
      }*/
      return 'scale(1)';
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

