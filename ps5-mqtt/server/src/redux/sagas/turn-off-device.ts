import lodash from "lodash"
import { call, getContext, put } from "redux-saga/effects"
import type { PlayactorClient } from "../../playactor/client"
import { PLAYACTOR_CLIENT } from "../../services"
import { createErrorLogger } from "../../util/error-logger"
import { setTransitioning, updateHomeAssistant } from "../action-creators"
import type { ChangePowerModeAction } from "../types"

const debugError = createErrorLogger()

function* turnOffDevice(action: ChangePowerModeAction) {
  if (action.payload.mode !== "STANDBY") {
    return
  }

  const playactor: PlayactorClient = yield getContext(PLAYACTOR_CLIENT)

  yield put(
    setTransitioning(
      lodash.merge({}, action.payload.device, { transitioning: true }),
    ),
  )
  try {
    yield call(
      [playactor, playactor.standby],
      action.payload.device.address.address,
    )

    yield put(
      updateHomeAssistant({
        ...action.payload.device,
        status: "STANDBY",
        activity: undefined, // also clear the activity when a device turns off
      }),
    )
  } catch (e) {
    debugError(e)
  }
}

export { turnOffDevice }
