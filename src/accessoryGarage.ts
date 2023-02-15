import {
  AccessoryConfig,
  AccessoryPlugin,
  API,
  HAP,
  Logging,
  Service
} from "homebridge";

export class InsControlGarage implements AccessoryPlugin {

  private readonly log: Logging;
  private readonly serialKey: string;
  private readonly btnCode: string;
  private readonly client;
  public static CRLF: string = "\r\n";
  private doorStatus: number;
  // This property must be existent!!
  name: string;

  private readonly service: Service;
  private readonly informationService: Service;

  constructor(log: Logging, config: AccessoryConfig, api: API, hap: HAP, serialKey, client) {
    this.log = log;
    this.serialKey = serialKey;
    this.btnCode = config.btnCode;
    this.doorStatus = hap.Characteristic.CurrentDoorState.CLOSED;
    this.client = client;
    this.name = config.name;

    this.service = new hap.Service.GarageDoorOpener(this.name);

    // create handlers for required characteristics
    this.service.getCharacteristic(hap.Characteristic.CurrentDoorState)
      .onGet(this.handleDoorStateGet.bind(this));

    this.service.getCharacteristic(hap.Characteristic.TargetDoorState)
      .onGet(this.handleDoorStateGet.bind(this))
      .onSet(this.handleTargetDoorStateSet.bind(this));

    this.informationService = new hap.Service.AccessoryInformation()
      .setCharacteristic(hap.Characteristic.Manufacturer, "Custom Manufacturer")
      .setCharacteristic(hap.Characteristic.Model, "Custom Model");

    log.info("Switch finished initializing!");

  }

  handleDoorStateGet() {
    this.log.info("Current "+this.name+" State: " + this.doorStatus);
    return this.doorStatus;
  }

  handleTargetDoorStateSet(value) {
    this.doorStatus = value as number;
    this.client.write(this.serialKey + this.btnCode + '00.0000000,00.0000000' + InsControlGarage.CRLF);
    this.log.debug(this.serialKey + this.btnCode + '00.0000000,00.0000000' + InsControlGarage.CRLF);
    //wait 1 sec
    this.closeDoor();
    this.log.info("Switch state was set to: " + this.doorStatus.toString());
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

  sleep(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  closeDoor = async () => {
    await this.sleep(1000);
    this.client.write(this.serialKey + ' 210 0000' + InsControlGarage.CRLF);

    await this.sleep(10000);
    this.doorStatus = 1;
    this.log.debug("doorClosed");
  };

}
