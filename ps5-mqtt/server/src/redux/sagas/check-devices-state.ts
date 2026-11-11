import createDebugger from "debug"
import { call, getContext, put, select } from "redux-saga/effects"
import type { PlayactorClient } from "../../playactor/client"
import { PLAYACTOR_CLIENT } from "../../services"
import { createErrorLogger } from "../../util/error-logger"
import { updateDevice, updateHomeAssistant } from "../action-creators"
import { getDeviceList } from "../selectors"
import type { Device } from "../types"

const debug = createDebugger("@ha:ps5:checkDevicesState")
const errorLogger = createErrorLogger()

// A console waking out-of-band (e.g. via DualSense controller or HDMI-CEC) or
// transitioning its network stack can drop a single UDP discovery probe for a
// few seconds. Require two consecutive failed polls before marking a previously
// available console offline in Home Assistant.
const MAX_TRANSIENT_CHECK_FAILURES = 1

function* checkDevicesState() {
  const playactor: PlayactorClient = yield getContext(PLAYACTOR_CLIENT)

  const devices: Device[] = yield select(getDeviceList)
  for (const device of devices) {
    try {
      const updatedDevice: Device = yield call(
        [playactor, playactor.check],
        device.address.address,
      )

      if (device.transitioning) {
        debug(
          "Device is transitioning",
          device.transitioning,
          updatedDevice.status,
        )
        continue
      }

      // only send updates if ps5 is truly changing states or when ps5 has become available
      if (device.status !== updatedDevice.status || !device.available) {
        debug("Update HA")
        yield put(
          updateHomeAssistant({
            ...device,
            status: updatedDevice.status,
            activity:
              updatedDevice.status !== "AWAKE"
                ? undefined
                : updatedDevice.activity,
            available: true,
            checkFailures: 0,
          }),
        )
      } else if ((device.checkFailures ?? 0) > 0) {
        yield put(updateDevice({ id: device.id, checkFailures: 0 }))
      }
    } catch (e) {
      errorLogger(e)

      if (device.transitioning) {
        debug("Device is transitioning; ignoring check failure")
        continue
      }

      const failures = (device.checkFailures ?? 0) + 1
      if (device.available && failures <= MAX_TRANSIENT_CHECK_FAILURES) {
        debug(
          `Transient check failure (${failures}/${MAX_TRANSIENT_CHECK_FAILURES}) for ${device.id}`,
        )
        yield put(updateDevice({ id: device.id, checkFailures: failures }))
        continue
      }

      // previously available ps5 cannot be located
      if (device.available || device.status !== "UNKNOWN") {
        yield put(
          updateHomeAssistant({
            ...device,
            status: "UNKNOWN",
            available: false,
            activity: undefined,
            checkFailures: failures,
          }),
        )
      }
    }
  }
}

export { checkDevicesState }
