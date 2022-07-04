import createDebugger from "debug"
import { merge } from "lodash"
import { delay, put } from "redux-saga/effects"
import { pollDevices, setTransitioning } from "../action-creators"
import type { SetTransitioningAction } from "../types"

const debug = createDebugger("@ha:ps5:checkDevicesState")

function* delayForTransition(action: SetTransitioningAction) {
  if (action.payload.transitioning) {
    yield delay(15000)
    debug("Resume polling")
    yield put(
      setTransitioning(merge({}, action.payload, { transitioning: false }))
    )
  } else {
    yield put(pollDevices())
  }
}

export { delayForTransition }
