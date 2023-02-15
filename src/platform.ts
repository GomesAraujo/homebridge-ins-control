import { AccessoryPlugin, API, HAP, Logging, PlatformConfig, StaticPlatformPlugin, } from "homebridge";
import { InsControlGarage } from "./accessoryGarage";
import { InsControlLock } from "./accessoryLock";

var net = require("net");
var client = new net.Socket();

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
    private api: API
  ) {

    client.connect(config.port, config.host, () => {
      log.info('Client connected to: ' + config.host + ':' + config.port);
      client.write(config.serialKey + ' 210 0000');
    });

    client.on('data', (data) => {
      this.log.debug('Client received: ' + data.toString());
      if (data.toString().includes('GETVERSION')) {
        client.write(config.serialKey + ' 212 APPREV1.1A' + InsControlGarage.CRLF);
      }
      else if (data.toString().toLowerCase().includes('query')) {
        client.write(config.serialKey + ' 210 0000' + InsControlGarage.CRLF);
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
        accessories[accessory.identifier] = new InsControlGarage(this.log, accessory, this.api, hap, this.config.serialKey, client);
      } else {
        accessories[accessory.identifier] = new InsControlLock(this.log, accessory, this.api, hap, this.config.serialKey, client);
      }
    }

    callback(Object.values(accessories));
  }


}
