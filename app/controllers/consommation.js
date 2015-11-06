app.controller('ConsommationCtrl', [
  '$scope', '$http', 'rpc', function($scope, $http, rpc) {
    $scope.chartNbPoints = 100;
    $scope.chart = null;
    $scope.config = {
      bindto: '#chart-consommation',
      size: {
        width: 1200,
        height: 600
      },
      data: {
        keys: {
          x: 'x',
          value: ['EAU', 'ELEC']
        },
        types: {
          'EAU': 'spline',
          'ELEC': 'bar'
        },
        json: []
      },
      bar: {
        width: {
          ratio: 1
        }
      },
      axis: {
        x: {
          'type': 'timeseries',
          'tick': {
            'format': '%x %X'
          }
        },
        y1: {
          'label': {
            'text': 'm3',
            'position': 'uter-middle'
          }
        },
        y2: {
          'label': {
            'text': 'kWh',
            'position': 'uter-middle'
          }
        }
      }
    };
    $scope.createGraph = function() {
      return $scope.chart = c3.generate($scope.config);
    };
    $scope.reload = function() {
      return $scope.loadNewData();
    };
    $scope.loadNewData = function() {
      return $http.get('http://192.168.1.2:5984/events/_design/domotix/_view/consommation?descending=true&limit=' + $scope.chartNbPoints).success(function(data, status, headers, config) {
        var newdata;
        newdata = {
          keys: $scope.config.data.keys,
          json: []
        };
        angular.forEach(data.rows, function(row, i) {
          var item;
          item = {
            x: moment(row.value.dateTime).toDate()
          };
          item[row.value.type] = row.value.value;
          newdata.json.push(item);
        });
        return $scope.chart.load(newdata);
      });
    };
    return $scope.createGraph();
  }
]);
