import {
  AccessoryConfig,
  AccessoryPlugin,
  API,
  CharacteristicEventTypes,
  CharacteristicGetCallback,
  CharacteristicSetCallback,
  CharacteristicValue,
  HAP,
  Logging,
  Service
} from "homebridge";

var net = require("net");

/*
 * IMPORTANT NOTICE
 *
 * One thing you need to take care of is, that you never ever ever import anything directly from the "homebridge" module (or the "hap-nodejs" module).
 * The above import block may seem like, that we do exactly that, but actually those imports are only used for types and interfaces
 * and will disappear once the code is compiled to Javascript.
 * In fact you can check that by running `npm run build` and opening the compiled Javascript file in the `dist` folder.
 * You will notice that the file does not contain a `... = require("homebridge");` statement anywhere in the code.
 *
 * The contents of the above import statement MUST ONLY be used for type annotation or accessing things like CONST ENUMS,
 * which is a special case as they get replaced by the actual value and do not remain as a reference in the compiled code.
 * Meaning normal enums are bad, const enums can be used.
 *
 * You MUST NOT import anything else which remains as a reference in the code, as this will result in
 * a `... = require("homebridge");` to be compiled into the final Javascript code.
 * This typically leads to unexpected behavior at runtime, as in many cases it won't be able to find the module
 * or will import another instance of homebridge causing collisions.
 *
 * To mitigate this the {@link API | Homebridge API} exposes the whole suite of HAP-NodeJS inside the `hap` property
 * of the api object, which can be acquired for example in the initializer function. This reference can be stored
 * like this for example and used to access all exported variables and classes from HAP-NodeJS.
 */
let hap: HAP;
var client = new net.Socket();

/*
 * Initializer function called when the plugin is loaded.
 */
export = (api: API) => {
  hap = api.hap;
  api.registerAccessory("InsControl", InsControl);
};

class InsControl implements AccessoryPlugin {

  private readonly log: Logging;
  private readonly name: string;
  private readonly host: string;
  private readonly port: number;
  private readonly serialKey: string;
  private readonly CRLF: string = "\r\n"; 	
  private doorStatus =  hap.Characteristic.CurrentDoorState.CLOSED;

  private readonly switchService: Service;
  private readonly informationService: Service;

  constructor(log: Logging, config: AccessoryConfig, api: API) {
    this.log = log;
    this.name = config.name;
    this.host = config.host;
    this.port = config.port;
    this.serialKey = config.serialKey;	  

    this.switchService = new hap.Service.GarageDoorOpener(this.name);
    this.switchService.getCharacteristic(hap.Characteristic.TargetDoorState)
      .on(CharacteristicEventTypes.GET, (callback: CharacteristicGetCallback) => {
        log.info("Target Door State: " + this.doorStatus);
        callback(undefined, this.doorStatus);
      })
      .on(CharacteristicEventTypes.SET, (value: CharacteristicValue, callback: CharacteristicSetCallback) => {
        this.doorStatus = value as number;
        client.write(this.serialKey + ' 210 0001 ' + '-22.8192889,-47.0148756' + this.CRLF);
	log.debug(this.serialKey + ' 210 0001 ' +'-22.8192889,-47.0148756' + this.CRLF); 
        //wait 1 sec
        this.closeDoor();
        log.info("Switch state was set to: " + this.doorStatus.toString());
        callback();
      });

    this.switchService.getCharacteristic(hap.Characteristic.CurrentDoorState)
      .on(CharacteristicEventTypes.GET, (callback: CharacteristicGetCallback) => {
        log.info("Current Door State: " + this.doorStatus);
        callback(undefined, this.doorStatus);
      });  

    this.informationService = new hap.Service.AccessoryInformation()
      .setCharacteristic(hap.Characteristic.Manufacturer, "Custom Manufacturer")
      .setCharacteristic(hap.Characteristic.Model, "Custom Model");

    log.info("Switch finished initializing!");

    client.connect(this.port, this.host, () => {
        log.info('Client connected to: ' + this.host + ':' + this.port);
        client.write(this.serialKey + ' 210 0000');
    });

    client.on('data', (data) => {    
        this.log.debug('Client received: ' + data.toString());
        if (data.toString().includes('GETVERSION')) {
          client.write(this.serialKey + ' 212 APPREV1.1A' + this.CRLF);
        }
	else if(data.toString().toLowerCase().includes('query')) {
          client.write(this.serialKey + ' 210 0000' + this.CRLF);
        }
    });

  }

  sleep(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  closeDoor = async () => {
    await this.sleep(1000);
    client.write(this.serialKey + ' 210 0000' + this.CRLF);
    this.doorStatus = 3;
    this.log.debug("doorClosing " + this.serialKey + ' 210 0000' + this.CRLF);
  
    await this.sleep(10000);
    this.doorStatus = 1;
    this.log.debug("doorClosed");
  };

  /*
   * This method is optional to implement. It is called when HomeKit ask to identify the accessory.
   * Typical this only ever happens at the pairing process.
   */
  identify(): void {
    this.log("Identify!");
  }

  /*
   * This method is called directly after creation of this instance.
   * It should return all services which should be added to the accessory.
   */
  getServices(): Service[] {
    return [
      this.informationService,
      this.switchService,
    ];
  }

}
