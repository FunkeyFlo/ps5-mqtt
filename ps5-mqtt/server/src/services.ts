export const MQTT_CLIENT = "MQTT"
export const SETTINGS = "SETTINGS"
export const PLAYACTOR_CLIENT = "PLAYACTOR_CLIENT"

export interface Settings {
  // polling intervals
  checkDevicesInterval: number
  discoverDevicesInterval: number
  checkAccountInterval: number

  credentialStoragePath: string
  allowPs4Devices: boolean

  // Optional PS5 login passcode, forwarded to playactor as `--pass-code` so
  // standby/wake still work when the console profile is passcode-protected
  // (otherwise playactor fails with PASSCODE_IS_NEEDED).
  loginPasscode?: string

  deviceDiscoveryBroadcastAddress: string

  discoveryTopic: string
}
