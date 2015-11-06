var hasProp = {}.hasOwnProperty;
var systemStates = {
  0: "Restart",
  1: "Radio On",
  2: "Radio Off",
  3: "Sync mode",
  4: "Low battery"
};

angular.module('domotix.filters', []).filter('fromNow', function() {
    return function(date) {
      return moment(date).fromNow();
    };
  }).filter('systemState', function() {
    return function(systemState) {
      return systemStates[systemState];
    };
  }).filter('objectToArray', function() {
    return function(object) {
      var ele, id, results;
      results = [];
      for (id in object) {
        if (!hasProp.call(object, id)) continue;
        ele = object[id];
        results.push(ele);
      }
      return results;
    };
  }).filter('num', function() {
    return function(value, dividor) {
      var i, index, item, mul, res;
      if (dividor == null) {
        dividor = 1;
      }
      res = 1;
      mul = 1;
      for (index = i = value.length - 1; i >= 0; index = i += -1) {
        item = value[index];
        res += mul * item;
        mul *= 256;
      }
      return res / dividor;
    };
  });