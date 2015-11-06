app.controller('AdminCtrl', [
  '$scope', 'websocketService', function($scope, websocketService) {
    var swap = isomorphic.swap;
    
    $scope.couchDbView = 'packet_event';
    $scope.cleanByView = function() {
      return websocketService.rpc('swapserver.cleanByView', $scope.couchDbView);
    };
    
    $scope.registers = swap.Registers;
    $scope.functions = swap.Functions;
    $scope.message = {
      address: 2,
      func: swap.Functions.QUERY,
      register: {
        id: swap.Registers.txInterval.id + 1,
        length: 1
      }
    };
    $scope.checkNewDevices = function() {
      return websocketService.rpc('swapserver.sendSwapQuery', swap.address.BROADCAST, swap.Registers.productCode.id);
    };
    
    $scope.newDevice = {
      productCode: "0000006400000002",
      hardwareVersion: "00000001",
      firmwareVersion: "00000001",
      address: 255
    };
    $scope.createNewDevice = function() {
      websocketService.rpc('swapserver.messageFromCloud', "00" + swap.num2byte($scope.newDevice.address) + "000100" + swap.num2byte($scope.newDevice.address) + "00" + $scope.newDevice.productCode);
      websocketService.rpc('swapserver.messageFromCloud', "00" + swap.num2byte($scope.newDevice.address) + "000200" + swap.num2byte($scope.newDevice.address) + "01" + $scope.newDevice.hardwareVersion);
      websocketService.rpc('swapserver.messageFromCloud', "00" + swap.num2byte($scope.newDevice.address) + "000300" + swap.num2byte($scope.newDevice.address) + "02" + $scope.newDevice.firmwareVersion);
    };
    
    $scope.changeDevice = {
      oldAddress: 255,
      newAddress: 6
    };
    $scope.changeDeviceAddress = function() {
      websocketService.rpc('swapserver.messageFromCloud', "00" + swap.num2byte($scope.changeDevice.oldAddress) + "000400" + swap.num2byte($scope.changeDevice.oldAddress) + "09" + swap.num2byte($scope.changeDevice.newAddress));
    };
    
    $scope.rawMessage = "(0000)";
    $scope.decodeMessage = function() {
      if($scope.rawMessage.length < 16) {
        return;
      }
      if($scope.rawMessage.length % 2 == 1) {
        return;
      }
      var ccPacket = new swap.CCPacket($scope.rawMessage);
      var swapPacket = new swap.SwapPacket(ccPacket);
      $scope.decodedMessage = swapPacket;
    };
    
    $scope.messageFromCloud = function() {
      websocketService.rpc('swapserver.messageFromCloud', $scope.decodedMessage.toString());
    };
  }
]);

