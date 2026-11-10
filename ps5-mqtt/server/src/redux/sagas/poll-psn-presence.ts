import { delay, getContext, put, select } from "redux-saga/effects"
import { Settings, SETTINGS } from "../../services"
import { createErrorLogger } from "../../util/error-logger"
import { checkPsnPresence } from "../action-creators"
import { getDeviceList } from "../selectors"
import { Device } from "../types"

const debugError = createErrorLogger()

function* pollPsnPresence() {
  const { checkAccountInterval, checkAccountIdleInterval }: Settings =
    yield getContext(SETTINGS)

  while (true) {
    let interval = checkAccountIdleInterval

    try {
      const devices: Device[] = yield select(getDeviceList)

      // Account presence comes from PSN's servers, so it is polled whether or
      // not a console is awake. Activity matching is only useful while a
      // console is awake, so only then poll at the faster interval.
      if (devices.some((d) => d.status === "AWAKE")) {
        interval = checkAccountInterval
      }

      yield put(checkPsnPresence())
    } catch (e) {
      debugError(e)
    }

    yield delay(interval)
  }
}

export { pollPsnPresence }
