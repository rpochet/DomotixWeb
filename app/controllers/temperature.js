app.controller('TemperatureCtrl', [
  '$scope', '$http', 'rpc', function($scope, $http, rpc) {
    $scope.chartType = 'spline';
    $scope.chartNbPoints = 100;
    $scope.chart = null;
    $scope.config = {
      bindto: '#chart-temperature',
      size: {
        width: 1200,
        height: 600
      },
      data: {
        keys: {
          x: 'x',
          value: []
        },
        json: []
      },
      axis: {
        x: {
          'type': 'timeseries',
          'tick': {
            'format': '%x %X'
          }
        },
        y: {
          'label': {
            'text': 'Temp. (°C)',
            'position': 'uter-middle'
          }
        }
      }
    };
    $scope.$watch('devices', function(newValue, oldValue) {
      var device, fn, id;
      if (newValue) {
        $scope.config.data.types = {};
        $scope.config.data.keys.value = [];
        fn = function(device) {
          var dataId;
          dataId = 'data' + device.address;
          $scope.config.data.types[dataId] = $scope.chartType;
          return $scope.config.data.keys.value.push(dataId);
        };
        for (id in newValue) {
          device = newValue[id];
          fn(device);
        }
        return $scope.createGraph();
      }
    });
    $scope.createGraph = function() {
      return $scope.chart = c3.generate($scope.config);
    };
    $scope.reload = function() {
      return $scope.loadNewData();
    };
    $scope.loadNewData = function() {
      return $http.get('http://192.168.1.2:5984/panstamp_packets/_design/domotix/_view/temperature?descending=true&limit=' + $scope.chartNbPoints).success(function(data, status, headers, config) {
        var newdata;
        newdata = {
          keys: $scope.config.data.keys,
          json: []
        };
        angular.forEach(data.rows, function(row, i) {
          var item;
          item = {
            x: moment(row.value.time).toDate()
          };
          item['data' + row.value.regAddress] = (row.value.value[0] * 256 + row.value.value[1]) / 100;
          newdata.json.push(item);
        });
        return $scope.chart.load(newdata);
      });
    };
    ss.server.on('ready', function() {
      return ss.rpc('swapserver.getDevices', function(devices) {
        return $scope.$apply(function() {
          return $scope.devices = devices;
        });
      });
    });
    return ss.event.on(swap.MQ.Type.SWAP_DEVICE, function() {
      return ss.rpc('swapserver.getDevices', function(devices) {
        return $scope.$apply(function() {
          return $scope.devices = devices;
        });
      });
    });
  }
]);

