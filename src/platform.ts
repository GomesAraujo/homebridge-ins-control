import { AccessoryPlugin, API, HAP, Logging, PlatformConfig, StaticPlatformPlugin, } from "homebridge";
import { InsControlGarage } from "./accessoryGarage";
import { InsControlLock } from "./accessoryLock";

var net = require("net");
var client = new net.Socket();
var self:INSPlatform;

const PLATFORM_NAME = "InsControl";
let hap: HAP;

export = (api: API) => {
  hap = api.hap;
  api.registerPlatform(PLATFORM_NAME, INSPlatform);
};

class INSPlatform implements StaticPlatformPlugin {

  constructor(
    private log: Logging,
    private config: PlatformConfig,
    private api: API,
  ) {
      self = this;
      client.connect(self.config.port, self.config.host, () => {
        self.log.info('Client connected to: ' + self.config.host + ':' + self.config.port);
        client.write(self.config.serialKey + ' 210 0000');
      });

      client.on('data', (data) => {
        self.log.debug('Client received: ' + data.toString());
        if (data.toString().includes('GETVERSION')) {
          client.write(self.config.serialKey + ' 212 APPREV1.1A' + InsControlGarage.CRLF);
        }
        else if (data.toString().toLowerCase().includes('query')) {
          client.write(self.config.serialKey + ' 210 0000' + InsControlGarage.CRLF);
        }
      });  
    }
  

  /*
   * This method is called to retrieve all accessories exposed by the platform.
   * The Platform can delay the response my invoking the callback at a later time,
   * it will delay the bridge startup though, so keep it to a minimum.
   * The set of exposed accessories CANNOT change over the lifetime of the plugin!
   */
  accessories = (callback: (foundAccessories: AccessoryPlugin[]) => void): void => {
    let accessories: { [key: string]: AccessoryPlugin } = {};
   
    for (let accessory of this.config.accessories) {
      if(accessory.identifier.toString().includes("GARAGE")) {
        accessories[accessory.identifier] = new InsControlGarage(this.log, accessory, this.api, hap, this.handleDoorStateGet, this.handleTargetDoorStateSet);
      } else {
        accessories[accessory.identifier] = new InsControlLock(this.log, accessory, this.api, hap, this.handleDoorStateGet, this.handleTargetDoorStateSet);
      }
    }

    callback(Object.values(accessories));
  }


  handleDoorStateGet(doorStatus, name) {
    self.log.info("Current "+name+" State: " + doorStatus);
    return doorStatus;
  }

  handleTargetDoorStateSet(doorStatus, btnCode) {
    client.write(self.config.serialKey + btnCode + '00.0000000,00.0000000' + InsControlLock.CRLF);
    self.log.debug(self.config.serialKey + btnCode + '00.0000000,00.0000000' + InsControlLock.CRLF);
    //wait 1 sec
    self.closeDoor(doorStatus);
    self.log.info("Switch state was set to: " + doorStatus.toString());
  }

  sleep(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  closeDoor = async (doorStatus) => {
    await self.sleep(1000);
    client.write(self.config.serialKey + ' 210 0000' + InsControlLock.CRLF);

    await self.sleep(10000);
    doorStatus = 1;
    self.log.debug("doorClosed");
  }

}
