import lodash from "lodash"
import { call, getContext, put } from "redux-saga/effects"
import type { PlayactorClient } from "../../playactor/client"
import { PLAYACTOR_CLIENT } from "../../services"
import { createErrorLogger } from "../../util/error-logger"
import { setTransitioning, updateHomeAssistant } from "../action-creators"
import type { ChangePowerModeAction } from "../types"

const debugError = createErrorLogger()

function* turnOnDevice(action: ChangePowerModeAction) {
  if (action.payload.mode !== "AWAKE") {
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
      [playactor, playactor.wake],
      action.payload.device.address.address,
    )

    yield put(
      updateHomeAssistant({
        ...action.payload.device,
        status: "AWAKE",
      }),
    )
  } catch (e) {
    debugError(e)
  }
}

export { turnOnDevice }
