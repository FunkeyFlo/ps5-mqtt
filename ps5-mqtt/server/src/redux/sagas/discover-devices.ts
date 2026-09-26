import { call, getContext, put, select } from "redux-saga/effects"
import { discoverDevices as findDevicesOnNetwork } from "../../playactor/discovery"
import { SETTINGS, Settings } from "../../services"
import { registerDevice } from "../action-creators"
import { getDeviceRegistry } from "../selectors"
import { Device } from "../types"

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
    if (trackedDevices[device.id] === undefined) {
      yield put(
        registerDevice({
          ...device,
          available: true,
          normalizedName: device.name
            .replace(/[^a-zA-Z\d\s-_:]/g, "")
            .replace(/[\s-]/g, "_")
            .toLowerCase(),
          activity: undefined,
        }),
      )
    }
  }
}

export { discoverDevices }
