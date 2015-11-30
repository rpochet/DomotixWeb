app.controller('DevicesCtrl', ['$scope', 'websocketService', function($scope, websocketService) {
    var swap = isomorphic.swap;
    
    $scope.selectedDevice = null;
    
    $scope.editedDevice = null;
    
    $scope.update = function() {
      $scope.selectedDevice = angular.copy($scope.editedDevice);
      if ($scope.selectedDevice) {
        websocketService.rpc('swapserver.updateDevice', $scope.editedDevice, $scope.selectedDevice);
      }
    };
    
    $scope.reset = function() {
      $scope.editedDevice = angular.copy($scope.selectedDevice);
    };
    
    $scope.isUnchanged = function() {
      return angular.equals($scope.editedDevice, $scope.selectedDevice);
    };
    
    $scope.selectDevice = function(device) {
      $scope.selectedDevice = device;
      $scope.reset();
    };
    
    $scope.noSee = function(device) {
      return moment().diff(moment(device.lastStatusTime)) / 1000 > 2 * device.txInterval;
    };
    
    $scope.getRegisterPartInUnit = function(swapRegister, swapEndpoint, unit) {
      return swap.getRegisterPartInUnit(swapRegister, swapEndpoint, unit);
    };
    
    $scope.$on(swap.MQ.Type.SWAP_DEVICE, function() {
      websocketService.rpc('swapserver.getSwapDevices').then(function(devices) {
        return $scope.$apply(function() {
          return $scope.devices = devices;
        });
      });
    });
    
    $scope["delete"] = function() {
      if ($scope.selectedDevice) {
        return websocketService.rpc('swapserver.deleteDevice').then($scope.selectedDevice.address);
      }
    };
  }
]);
