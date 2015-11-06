app.controller('EventsCtrl', [
  '$scope', 'rpc', 'ngToast', function($scope, rpc, ngToast) {
    $scope.eventTypes = [
      {
        name: 'EAU',
        description: 'Valeur du compteur en m3',
        label: 'Eau',
        unit: 'm3'
      }, {
        name: 'ELEC',
        description: 'Choisir un sous type',
        label: 'Electricite',
        subTypes: [
          {
            name: 'HP',
            description: 'Valeur du compteur heure pleine. Arrondir à l\'unité',
            label: 'Heure pleine',
            unit: 'kWh'
          }, {
            name: 'HC',
            description: 'Valeur du compteur heure creuse. Arrondir à l\'unité',
            label: 'Heure creuse',
            unit: 'kWh'
          }
        ]
      }
    ];
    $scope.$watch('eventType', function(newValue, oldValue) {
      return $scope.eventSubType = void 0;
    });
    return $scope.createEvent = function() {
      var eventData;
      eventData = {
        type: $scope.eventType.name,
        detail: $scope.eventDetail,
        value: $scope.eventValue,
        unit: $scope.eventType.unit
      };
      if ($scope.eventSubType) {
        eventData.subtype = $scope.eventSubType.name;
      }
      if ($scope.eventSubType) {
        eventData.unit = $scope.eventSubType.unit;
      }
      return ss.rpc('swapserver.createEvent', eventData, function(err, res) {
        if (err) {
          return ngToast.create({
            content: 'Event not created',
            className: 'danger'
          });
        } else {
          if (!err) {
            return ngToast.create('Event created');
          }
        }
      });
    };
  }
]);
