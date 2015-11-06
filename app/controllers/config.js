app.controller('ConfigCtrl', ['$scope', 'websocketService', function($scope, websocketService) {
    
    $scope.editedConfig = null;
    
    $scope.update = function() {
      $scope.config = angular.copy($scope.editedConfig);
      if ($scope.config) {
        return websocketService.rpc('swapserver.updateConfig', $scope.config);
      }
    };
    
    $scope.reset = function() {
      return $scope.editedConfig = angular.copy($scope.config);
    };
    
    $scope.isUnchanged = function() {
      return angular.equals($scope.editedConfig, $scope.config);
    };
  }
]);
