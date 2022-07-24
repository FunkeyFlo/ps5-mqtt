export const MQTT_CLIENT = 'MQTT';
export const SETTINGS = 'SETTINGS';

export interface Settings {
    checkDevicesInterval: number;
    discoverDevicesInterval: number;
    credentialStoragePath: string;
}