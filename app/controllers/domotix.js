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
    
    $scope.$on(swap.MQ.Type.SWAP_DEVICE, function() {
      websocketService.rpc('swapserver.getSwapDevices').then(function(devices) {
        return $scope.devices = devices;
      });
    });
    
    $scope.$on(swap.MQ.Type.TEMPERATURE, function(temperature) {
      return displayTemperature(temperature);
    });
    
    $scope.$on(swap.MQ.Type.PRESSURE, function(pressure) {
      return displayPressure(pressure);
    });
    
    $scope.$on('lightStatusUpdated', function(lightStatus) {
      return $scope.$apply(function() {
        var j, len, level, ref, results;
        ref = $scope.levels;
        results = [];
        for (j = 0, len = ref.length; j < len; j++) {
          level = ref[j];
          results.push((function(level) {
            var k, len1, ref1, results1, room;
            ref1 = level.rooms;
            results1 = [];
            for (k = 0, len1 = ref1.length; k < len1; k++) {
              room = ref1[k];
              results1.push((function(room) {
                var l, len2, light, ref2, results2;
                ref2 = room.lights;
                results2 = [];
                for (l = 0, len2 = ref2.length; l < len2; l++) {
                  light = ref2[l];
                  results2.push((function(light) {
                    if (lightStatus.regAddress === light.swapDeviceAddress) {
                      return light.status = lightStatus.value[light.outputNb];
                    }
                  })(light));
                }
                return results2;
              })(room));
            }
            return results1;
          })(level));
        }
        return results;
      });
    });
    
    displayTemperature = function(temperature) {
      $scope.temperature = {};
      return $scope.$apply(function() {
        var devAddr, temp;
        for (devAddr in temperature) {
          temp = temperature[devAddr];
          $scope.temperature[devAddr] = {};
          $scope.temperature[devAddr].temperature = temp;
          $scope.temperature[devAddr].location = $scope.devices['DEV' + swap.num2byte(devAddr)].location;
          $scope.devices['DEV' + swap.num2byte(devAddr)].temperature = temp;
          return;
        }
      });
    };
    
    displayPressure = function(pressure) {
      $scope.pressure = {};
      return $scope.$apply(function() {
        var devAddr, pres;
        for (devAddr in pressure) {
          pres = pressure[devAddr];
          $scope.pressure[devAddr] = {};
          $scope.pressure[devAddr].pressure = pres;
          $scope.pressure[devAddr].location = $scope.devices['DEV' + swap.num2byte(devAddr)].location;
          $scope.devices['DEV' + swap.num2byte(devAddr)].pressure = pres;
          return;
        }
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

