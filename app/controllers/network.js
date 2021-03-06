app.controller('NetworkCtrl', [
  '$scope', '$http', 'websocketService', function($scope, $http, websocketService) {
    var swap = isomorphic.swap;
    
    var s;
    var minSource = 2;
    var maxSource = 4;
    var formatDate = d3.time.format("%Y-%m-%d %H:%M:%S");
    var formatUpdateDate = d3.time.format("%Y-%m-%d %H:%M:%S");
    var defaultMinRSSI = -120;
    var defaultMaxRSSI = 0;
    var defaultMinLQI = 0;
    var defaultMaxLQI = 50;
    
    $scope.quality = {
      zoomRSSI: false,
      zoomLQI: false,
      offsetData: 0,
      nbData: 100,
      rowsHeader: [],
      nbGraph: maxSource - minSource + 1,
      options: {
        bindto: '#chart-quality',
        data: {
          xs: {},
          columns: [],
          axes: {}
        },
        axis: {
          x: {
            type: 'timeseries',
            tick: {
              format: function(x) {
                return d3.time.format('%m-%d %H:%M')(x);
              }
            }
          },
          y: {
            show: true,
            label: {
              text: 'RSSI',
              position: 'outer-middle'
            },
            min: defaultMinRSSI,
            max: defaultMaxRSSI
          },
          y2: {
            show: true,
            label: {
              text: 'LQI',
              position: 'outer-middle'
            },
            min: defaultMinLQI,
            max: defaultMaxLQI
          }
        }
      }
    };
    s = minSource;
    while (s <= maxSource) {
      $scope.quality.options.data.xs['RSSI-' + s] = 'x-' + s;
      $scope.quality.options.data.xs['LQI-' + s] = 'x-' + s;
      $scope.quality.options.data.columns[0 + $scope.quality.nbGraph * (s - minSource)] = ['x-' + s];
      $scope.quality.options.data.columns[1 + $scope.quality.nbGraph * (s - minSource)] = ['RSSI-' + s];
      $scope.quality.options.data.columns[2 + $scope.quality.nbGraph * (s - minSource)] = ['LQI-' + s];
      $scope.quality.options.data.axes['LQI-' + s] = 'y2';
      s++;
    }
    $scope.createQualityGraph = function() {
      return $scope.quality.chart = c3.generate($scope.quality.options);
    };
    
    var loadQuality = function($event) {
      return $http.get('http://192.168.1.2:5984/panstamp_packets/_design/domotix/_view/network_status', {
        params: {
          skip: $scope.quality.offsetData,
          limit: $scope.quality.nbData,
          descending: true
        }
      }).success(function(data) {
        angular.forEach($scope.quality.options.data.columns, function(column) {
          column.splice(1);
        });
        angular.forEach(data.rows, function(row, idx) {
          var source, value;
          value = row.value;
          source = parseInt(value.source);
          if (source > 1 && source !== 255) {
            $scope.quality.options.data.columns[0 + $scope.quality.nbGraph * (source - minSource)].push(d3.time.format.iso.parse(value.time));
            $scope.quality.options.data.columns[1 + $scope.quality.nbGraph * (source - minSource)].push(value.RSSI);
            $scope.quality.options.data.columns[2 + $scope.quality.nbGraph * (source - minSource)].push(value.LQI);
          }
        });
        $scope.quality.chart.load({
          columns: $scope.quality.options.data.columns
        });
        angular.element($event.currentTarget).removeClass('loading');
      });
    };
    $scope.refreshQuality = function($event) {
      angular.element($event.currentTarget).addClass('loading');
      return loadQuality($event);
    };
    $scope.previousQuality = function($event) {
      $scope.quality.offsetData = $scope.quality.offsetData + $scope.quality.nbData;
      return $scope.refreshQuality($event);
    };
    $scope.nextQuality = function($event) {
      if ($scope.quality.offsetData <= 0) {
        return;
      }
      $scope.quality.offsetData = $scope.quality.offsetData - $scope.quality.nbData;
      return $scope.refreshQuality($event);
    };
    
    $scope.nonce = {
      offsetData: 0,
      nbData: 100,
      rowsHeader: [],
      nbGraph: 2,
      options: {
        bindto: '#chart-nonce',
        data: {
          xs: {},
          columns: [],
          axes: {}
        },
        axis: {
          x: {
            type: 'timeseries',
            tick: {
              format: function(x) {
                return d3.time.format('%m-%d %H:%M')(x);
              }
            }
          },
          y: {
            show: true,
            label: {
              text: 'Nonce',
              position: 'outer-middle'
            }
          }
        }
      }
    };
    s = minSource;
    while (s <= maxSource) {
      $scope.nonce.options.data.xs['N-' + s] = 'x-' + s;
      $scope.nonce.options.data.columns[0 + $scope.nonce.nbGraph * (s - minSource)] = ['x-' + s];
      $scope.nonce.options.data.columns[1 + $scope.nonce.nbGraph * (s - minSource)] = ['N-' + s];
      s++;
    }
    $scope.createNonceGraph = function() {
      return $scope.nonce.chart = c3.generate($scope.nonce.options);
    };
    var loadNonce = function(addr, $event) {
      return $http.get('http://192.168.1.2:5984/panstamp_packets/_design/domotix/_view/nonce_' + addr, {
        params: {
          skip: $scope.nonce.offsetData,
          limit: $scope.nonce.nbData,
          descending: true
        }
      }).success(function(data) {
        angular.forEach($scope.nonce.options.data.columns, function(column) {
          column.splice(1);
        });
        angular.forEach(data.rows, function(row, idx) {
          $scope.nonce.options.data.columns[0 + $scope.nonce.nbGraph * (addr - minSource)].push(d3.time.format.iso.parse(row.key));
          $scope.nonce.options.data.columns[1 + $scope.nonce.nbGraph * (addr - minSource)].push(row.value);
        });
        $scope.nonce.chart.load({
          columns: $scope.nonce.options.data.columns
        });
        angular.element($event.currentTarget).removeClass('loading');
      });
    };
    $scope.refreshNonce = function($event) {
      angular.element($event.currentTarget).addClass('loading');
      for (var addr = minSource; addr < maxSource; addr++) {
        loadNonce(addr, $event);
      }
    };
    $scope.previousNonce = function($event) {
      angular.element($event.currentTarget).addClass('loading');
      $scope.nonce.offsetData = $scope.nonce.offsetData + $scope.nonce.nbData;
      $scope.refreshNonce($event);
    };
    $scope.nextNonce = function($event) {
      angular.element($event.currentTarget).addClass('loading');
      if ($scope.nonce.offsetData <= 0) {
        return;
      }
      $scope.nonce.offsetData = $scope.nonce.offsetData - $scope.nonce.nbData;
      $scope.refreshNonce($event);
    };
    
    $scope.swapPackets = [];
    $scope.swapEvents = [];
    
    $scope.$on('websocket:ready', function() {
      $scope.refreshConfig();
      $scope.createQualityGraph();
      $scope.createNonceGraph();
    });
    
    $scope.refreshSwapPackets = function() {
      websocketService.rpc('swapserver.getSwapPackets').then(function(swapPackets) {
        return $scope.swapPackets = swapPackets;
      });
    };
    $scope.refreshSwapEvents = function() {
      websocketService.rpc('swapserver.getSwapEvents').then(function(swapEvents) {
        return $scope.swapEvents = swapEvents;
      });
    };
    
    $scope.$on(swap.MQ.Type.SWAP_PACKET, function(sp) {
      return $scope.$apply(function() {
        $scope.swapPackets.splice(0, 0, sp);
        if ($scope.swapPackets.length > 40) {
          return $scope.swapPackets.pop();
        }
      });
    });
    $scope.$on(swap.MQ.Type.SWAP_EVENT, function(se) {
      return $scope.$apply(function() {
        $scope.swapEvents.splice(0, 0, se);
        if ($scope.swapEvents.length > 40) {
          return $scope.swapEvents.pop();
        }
      });
    });
  }
]);
