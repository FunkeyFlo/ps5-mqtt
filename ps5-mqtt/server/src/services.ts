export const MQTT_CLIENT = 'MQTT';
export const SETTINGS = 'SETTINGS';

export interface Settings {
    // polling intervals
    checkDevicesInterval: number;
    discoverDevicesInterval: number;
    checkAccountInterval: number;

    credentialStoragePath: string;
    allowPs4Devices: boolean;

    deviceDiscoveryBroadcastAddress: string;
}