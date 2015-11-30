app.controller('PluginsCtrl', ['$scope', '$http', function($scope, $http) {
    $scope.name = 'Homepage';
    
    $scope.suggest = function() {
        $http.get('/suggest.json')
            .success(function(data) {
                console.log(data);
            });
    };
    $scope.suggest();
        
}]);
