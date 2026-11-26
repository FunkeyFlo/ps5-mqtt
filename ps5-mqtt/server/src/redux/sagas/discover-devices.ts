import { call, getContext, put, select } from "redux-saga/effects"
import { discoverDevices as findDevicesOnNetwork } from "../../playactor/discovery"
import { SETTINGS, Settings } from "../../services"
import { registerDevice } from "../action-creators"
import { getDeviceRegistry } from "../selectors"
import { Device } from "../types"

function toNormalizedName(name: string): string {
  return name
    .replace(/[^a-zA-Z\d\s-_:]/g, "")
    .replace(/[\s-]/g, "_")
    .toLowerCase()
}

function* discoverDevices() {
  const { allowPs4Devices, deviceDiscoveryBroadcastAddress }: Settings =
    yield getContext(SETTINGS)

  const discoveredDevices: Device[] = yield call(findDevicesOnNetwork, {
    allowPs4Devices,
    deviceDiscoveryBroadcastAddress,
    timeoutMillis: 3000,
  })

  const trackedDevices = yield select(getDeviceRegistry)
  for (const device of discoveredDevices) {
    const trackedDevice = trackedDevices[device.id]
    if (trackedDevice === undefined) {
      yield put(
        registerDevice({
          ...device,
          available: true,
          normalizedName: toNormalizedName(device.name),
          activity: undefined,
        }),
      )
      continue
    }

    // A console that was off can come back on a new address (new DHCP lease).
    // Re-register so checks and power commands follow it; otherwise they keep
    // dialling the stale IP and the device stays unavailable until a restart.
    if (trackedDevice.address.address !== device.address.address) {
      yield put(
        registerDevice({
          ...trackedDevice,
          address: device.address,
          name: device.name,
          normalizedName: toNormalizedName(device.name),
          systemVersion: device.systemVersion,
          type: device.type,
        }),
      )
    }
  }
}

export { discoverDevices }
