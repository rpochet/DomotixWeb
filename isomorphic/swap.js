var Address, CCPacket, Functions, LightController, LightSwitch, MQ, Registers, SwapPacket, SwapStates, bytePad, getPressure, getTemperature, getValue, num2byte;

CCPacket = (function() {
  function CCPacket(strPacket) {
    var i;
    if (strPacket.length % 2 !== 0) {
      throw new Error("Packet length must be even: " + strPacket.length);
      return;
    }
    this.RSSI = parseInt(strPacket.slice(1, 3), 16);
    this.LQI = parseInt(strPacket.slice(3, 5), 16);
    this.data = [];
    i = 6;
    while (i < strPacket.length) {
      this.data.push(parseInt(strPacket.slice(i, i + 2), 16));
      i += 2;
    }
    this.time = new Date();
  }

  return CCPacket;

})();

SwapPacket = (function() {
  function SwapPacket(ccPacket) {
    this.RSSI = (ccPacket != null ? ccPacket.RSSI : void 0) >= 128 ? ((ccPacket != null ? ccPacket.RSSI : void 0) - 256) / 2 - 74 : (ccPacket != null ? ccPacket.RSSI : void 0) / 2 - 74;
    this.LQI = ccPacket != null ? ccPacket.LQI : void 0;
    this.dest = ccPacket != null ? ccPacket.data[0] : void 0;
    this.source = ccPacket != null ? ccPacket.data[1] : void 0;
    this.hop = (ccPacket != null ? ccPacket.data[2] : void 0) >> 4 && 0x0F;
    this.security = (ccPacket != null ? ccPacket.data[2] : void 0) || 0 && 0x0F;
    this.nonce = (ccPacket != null ? ccPacket.data[3] : void 0) || 0;
    this.func = ccPacket != null ? ccPacket.data[4] : void 0;
    this.regAddress = ccPacket != null ? ccPacket.data[5] : void 0;
    this.regId = ccPacket != null ? ccPacket.data[6] : void 0;
    this.regValue = ccPacket != null ? ccPacket.data.slice(7, ccPacket != null ? ccPacket.data.length : void 0) : void 0;
    this.time = ccPacket != null ? ccPacket.time : void 0;
  }

  SwapPacket.prototype.fromObject = function(obj) {
    this.RSSI = obj != null ? obj.RSSI : void 0;
    this.LQI = obj != null ? obj.LQI : void 0;
    this.dest = obj != null ? obj.dest : void 0;
    this.source = obj != null ? obj.source : void 0;
    this.hop = obj != null ? obj.hop : void 0;
    this.security = obj != null ? obj.security : void 0;
    this.nonce = obj != null ? obj.nonce : void 0;
    this.func = obj != null ? obj.func : void 0;
    this.regAddress = obj != null ? obj.regAddress : void 0;
    this.regId = obj != null ? obj.regId : void 0;
    this.regValue = obj != null ? obj.regValue : void 0;
    return this.time = obj != null ? obj.time : void 0;
  };

  SwapPacket.prototype.toString = function() {
    var i, res, temp;
    res = ((function() {
      var j, len, ref, results1;
      ref = [this.dest, this.source];
      results1 = [];
      for (j = 0, len = ref.length; j < len; j++) {
        i = ref[j];
        results1.push(num2byte(i));
      }
      return results1;
    }).call(this)).join('');
    res += this.hop.toString(16) + this.security.toString(16);
    res += ((function() {
      var j, len, ref, results1;
      ref = [this.nonce, this.func, this.regAddress, this.regId];
      results1 = [];
      for (j = 0, len = ref.length; j < len; j++) {
        i = ref[j];
        results1.push(num2byte(i));
      }
      return results1;
    }).call(this)).join('');
    if (this.regValue !== void 0) {
      temp = this.regValue.length === void 0 ? [this.regValue] : this.regValue;
      res += ((function() {
        var j, len, results1;
        results1 = [];
        for (j = 0, len = temp.length; j < len; j++) {
          i = temp[j];
          results1.push(num2byte(i));
        }
        return results1;
      })()).join('');
    }
    return res;
  };

  return SwapPacket;

})();

array2string = function(values) {
  var res = "";
  for(var i = 0; i < values.length; i++) {
    res += num2byte(values[i]);    
  }
  return res;
};

num2byte = function(number) {
  return ('00' + (number != null ? number.toString(16) : void 0)).slice(-2);
};

bytePad = function(byte, number) {
  var a;
  return (((function() {
    var j, ref, results1;
    results1 = [];
    for (a = j = 0, ref = number + 1; 0 <= ref ? j <= ref : j >= ref; a = 0 <= ref ? ++j : --j) {
      results1.push('00');
    }
    return results1;
  })()).join('') + byte).slice(-(2 * number));
};

getValue = function(value, length) {
  var fn, i, j, k, ref, ref1, results, results1;
  if (typeof value === 'string' || value instanceof String) {
    results = [];
    fn = function(i) {
      var b;
      b = value.substr(i * 2, 2);
      results.push(parseInt(b, 16));
    };
    for (i = j = 0, ref = value.length / 2 - 1; 0 <= ref ? j <= ref : j >= ref; i = 0 <= ref ? ++j : --j) {
      fn(i);
    }
    return results;
  } else {
    results1 = [];
    for (i = k = ref1 = length - 1; ref1 <= 0 ? k <= 0 : k >= 0; i = ref1 <= 0 ? ++k : --k) {
      results1.push((value >> 8 * i) & 255);
    }
    return results1;
  }
};

arrayToInt = function(value) {
  var res = 0;
  var mul = 1;
  for(i = value.length - 1; i >= 0; i--) {
    res += value[i] * mul;
    mul *= 256;
  }
  return res;
};

getRegisterPartInUnit = function(swapRegister, swapEndpoint, unit) {
  var subValue = null;
  if(swapRegister.value) {
    subValue =  swapRegister.value.slice(parseFloat(swapEndpoint.position), parseFloat(swapEndpoint.position) + parseFloat(swapEndpoint.size));
    if(swapEndpoint.type === "number") {
      var res = arrayToInt(subValue);
      if(unit) {        
        res = res * (unit.factor || 1) + (unit.offset || 0);
        if(unit.name) {
          res += ' ' + unit.name;
        }
      }
      return res;
    } 
  }
  return subValue;
};

getTemperature = function(swapPacket) {
  return (swapPacket.value[0] * 256 + swapPacket.value[1]) / 100;
};

getPressure = function(swapPacket) {
  if (swapPacket.value.length !== 6) {
    return "N.A";
  }
  return (swapPacket.value[2] * 256 * 256 * 256 + swapPacket.value[3] * 256 * 256 + swapPacket.value[4] * 256 + swapPacket.value[5]) / 100;
};

Address = {
  BROADCAST: 255
};

Functions = {
  STATUS: 0,
  QUERY: 1,
  COMMAND: 2,
  CUSTOM_1: 3,
  CUSTOM_2: 4,
  CUSTOM_3: 5
};

Registers = {
  productCode: {
    id: 0,
    length: 8
  },
  hardwareVersion: {
    id: 1,
    length: 4
  },
  firmwareVersion: {
    id: 2,
    length: 4
  },
  state: {
    id: 3,
    length: 1
  },
  channel: {
    id: 4,
    length: 1
  },
  security: {
    id: 5,
    length: 1
  },
  password: {
    id: 6,
    length: void 0
  },
  nonce: {
    id: 7,
    length: 1
  },
  network: {
    id: 8,
    length: 2
  },
  address: {
    id: 9,
    length: 1
  },
  txInterval: {
    id: 10,
    length: -1
  },
  CUSTOM_1: {
    id: 11,
    length: -1
  },
  CUSTOM_2: {
    id: 12,
    length: -1
  },
  CUSTOM_3: {
    id: 13,
    length: -1
  },
  CUSTOM_4: {
    id: 14,
    length: -1
  },
  CUSTOM_5: {
    id: 15,
    length: -1
  }
};

SwapStates = {
  RESTART: {
    level: 0,
    str: "Restart"
  },
  RXON: {
    level: 1,
    str: "Radio On"
  },
  RXOFF: {
    level: 2,
    str: "Radio Off"
  },
  SYNC: {
    level: 3,
    str: "Sync mode"
  },
  LOWBAT: {
    level: 4,
    str: "Low battery"
  },
  get: function(val) {
    return [this.RESTART, this.RXON, this.RXOFF, this.SYNC, this.LOWBAT][val];
  }
};

LightController = {
  productCode: "0000006400000001",
  Functions: {
    Light: Functions.CUSTOM_1,
    Reset: Functions.CUSTOM_2
  },
  Registers: {
    PressureTemperature: Registers.CUSTOM_2,
    Outputs: Registers.CUSTOM_4
  },
  Values: {
    On: 254,
    Off: 0,
    Toggle: 255
  }
};

LightSwitch = {
  productCode: "0000006400000002",
  Registers: {
    Voltage: Registers.CUSTOM_1,
    Temperature: Registers.CUSTOM_3
  }
};

MQ = {
  Type: {
    MANAGEMENT: "MANAGEMENT",
    SWAP_PACKET: "SWAP_PACKET",
    SWAP_DEVICE: "SWAP_DEVICE",
    SWAP_EVENT: "SWAP_EVENT",
    LIGHT_STATUS: "LIGHT_STATUS",
    TEMPERATURE: "TEMPERATURE",
    PRESSURE: "PRESSURE",
    VOLTAGE: "VOLTAGE",
    CLIENTS: "CLIENTS",
    _ALL: "_ALL"
  },
  SubType: {
    NETWORK: "NETWORK"
  },
  Extra: {
    SERVER_STARTED: "SERVER_STARTED",
    SERVER_STOPPED: "SERVER_STOPPED"
  }
};

// Very important for transferring of code between server-side and client-side.
// The framework supports several ways how to transfer code into the client-side.
exports.url = '/swap.js';

exports.CCPacket = CCPacket;
exports.SwapPacket = SwapPacket;
exports.Address = Address;
exports.Functions = Functions;
exports.Registers = Registers;
exports.SwapStates = SwapStates;
exports.LightController = LightController;
exports.LightSwitch = LightSwitch;
exports.MQ = MQ;
exports.bytePad = bytePad;
exports.num2byte = num2byte;
exports.arrayToInt = arrayToInt;
exports.array2string = array2string;
exports.getValue = getValue;
exports.getRegisterPartInUnit = getRegisterPartInUnit;
exports.getTemperature = getTemperature;
exports.getPressure = getPressure;
