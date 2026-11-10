import lodash from "lodash"
import { call, delay, getContext, put } from "redux-saga/effects"
import {
  WakeUnconfirmedError,
  type PlayactorClient,
} from "../../playactor/client"
import { PLAYACTOR_CLIENT } from "../../services"
import { createErrorLogger } from "../../util/error-logger"
import { setTransitioning, updateHomeAssistant } from "../action-creators"
import type { ChangePowerModeAction, Device } from "../types"

const debugError = createErrorLogger()

const WAKE_CONFIRM_ATTEMPTS = 3
const WAKE_CONFIRM_DELAY_MS = 5000

function* confirmAwake(playactor: PlayactorClient, device: Device) {
  for (let attempt = 0; attempt < WAKE_CONFIRM_ATTEMPTS; attempt++) {
    yield delay(WAKE_CONFIRM_DELAY_MS)
    try {
      const checked: Device = yield call(
        [playactor, playactor.check],
        device.address.address,
      )
      if (checked.status === "AWAKE") {
        yield put(updateHomeAssistant({ ...device, status: "AWAKE" }))
        return
      }
    } catch (e) {
      debugError(e)
    }
  }
}

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
    if (e instanceof WakeUnconfirmedError) {
      yield* confirmAwake(playactor, action.payload.device)
    }
  }
}

export { turnOnDevice }
