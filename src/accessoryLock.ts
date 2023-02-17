import {
  AccessoryConfig,
  AccessoryPlugin,
  API,
  HAP,
  Logging,
  Service,
  CharacteristicEventTypes,
  CharacteristicValue,
  CharacteristicSetCallback,
  CharacteristicGetCallback
} from "homebridge";

export class InsControlLock implements AccessoryPlugin {

  private readonly log: Logging;
  private readonly btnCode: string;
  public static CRLF: string = "\r\n";
  private doorStatus: number;
  // This property must be existent!!
  name: string;

  private readonly service: Service;
  private readonly informationService: Service;

  constructor(log: Logging, config: AccessoryConfig, api: API, hap: HAP, handleDoorStateGet, handleTargetDoorStateSet) {
    this.log = log;
    this.btnCode = config.btnCode;
    this.doorStatus = hap.Characteristic.LockCurrentState.SECURED;
    this.name = config.name;

    this.service = new hap.Service.LockMechanism(this.name);

    // create handlers for required characteristics
    this.service.getCharacteristic(hap.Characteristic.LockCurrentState)
      .on(CharacteristicEventTypes.GET, (callback: CharacteristicGetCallback) => {
        handleDoorStateGet(this.doorStatus, this.name)
        callback(undefined, this.doorStatus);
      });

    this.service.getCharacteristic(hap.Characteristic.LockTargetState)
      .on(CharacteristicEventTypes.GET, (callback: CharacteristicGetCallback) => {
        handleDoorStateGet(this.doorStatus, this.name);
        callback(undefined, this.doorStatus);
      })
      .on(CharacteristicEventTypes.SET, (value: CharacteristicValue, callback: CharacteristicSetCallback) => {
        this.doorStatus = value as number;
        handleTargetDoorStateSet(this.doorStatus, this.btnCode);
        callback();
      });

    this.informationService = new hap.Service.AccessoryInformation()
      .setCharacteristic(hap.Characteristic.Manufacturer, "Custom Manufacturer")
      .setCharacteristic(hap.Characteristic.Model, "Custom Model");

    log.info("Switch finished initializing!");

  }

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
      this.service,
    ];
  }

}
