app.controller('AdminCtrl', [ '$scope', 'websocketService', function($scope, websocketService) {
    var swap = isomorphic.swap;
    
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
    
    /**
     * Simulate a new device
     */
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
    
    /**
     * Change device address
     */
    $scope.changeDevice = {
      oldAddress: 255,
      newAddress: 6
    };
    $scope.changeDeviceAddress = function() {
      websocketService.rpc('swapserver.messageFromCloud', "00" + swap.num2byte($scope.changeDevice.oldAddress) + "000400" + swap.num2byte($scope.changeDevice.oldAddress) + "09" + swap.num2byte($scope.changeDevice.newAddress));
    };
    
    /**
     * Change light status
     */
    $scope.lightStatus = new Array();
    for(var i=0; i < 24; i++) {
      $scope.lightStatus.push("00");
    }
    $scope.changeLightStatus = function(light) {
      $scope.lightStatus[light.outputNb] = $scope.lightStatus[light.outputNb] === "00" ? "FE" : "00"; 
      websocketService.rpc('swapserver.messageFromCloud', "00" + swap.num2byte(light.swapDeviceAddress) + "000100" + swap.num2byte(light.swapDeviceAddress) + "0E" + $scope.lightStatus.join(""));
    };
    
    /**
     * Message
     */
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
    
    /**
     * CouchDB
     */
    $scope.couchDbView = 'packet_event';
    $scope.cleanByView = function() {
      return websocketService.rpc('swapserver.cleanByView', $scope.couchDbView);
    };
    
    /**
     * Upgrade firmware
     */
    $scope.upgrade = {
      devAddress: 2,
      firmwareId: '00000001000000010000000100000001',
      itemNb: '0000'
    };
    
    $scope.startUpgrade = function(upgrade) {
      websocketService.rpc('swapserver.startUpgrade', upgrade.devAddress, upgrade.firmwareId);
    };
    
    $scope.requestItem = function(upgrade) {
      return websocketService.rpc('swapserver.messageFromCloud', "00" + swap.num2byte(upgrade.devAddress) + "000101" + swap.num2byte(upgrade.devAddress) + "0B" + upgrade.itemNb);
    };
    
    $scope.endUpgrade = function(upgrade) {
      return websocketService.rpc('swapserver.messageFromCloud', "00" + swap.num2byte(upgrade.devAddress) + "000100" + swap.num2byte(upgrade.devAddress) + "0300");
    };
    
  }
]);

