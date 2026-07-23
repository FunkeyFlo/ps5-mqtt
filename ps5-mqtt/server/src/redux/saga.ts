import {
  all,
  call,
  fork,
  race,
  take,
  takeEvery,
  takeLatest,
} from "redux-saga/effects"
import * as sagas from "./sagas"

function* discoverDevicesSaga() {
  yield takeLatest("DISCOVER_DEVICES", sagas.discoverDevices)
}

function* pollDisoverySaga() {
  yield takeLatest("POLL_DISCOVERY", sagas.pollDisovery)
}

function* pollPsnPresenceSaga() {
  yield takeLatest("POLL_PSN_PRESENCE", sagas.pollPsnPresence)
}

function* addDevicesSaga() {
  yield takeLatest("REGISTER_DEVICE", sagas.registerDevice)
}

function* turnOnSaga() {
  yield takeLatest("CHANGE_POWER_MODE", sagas.turnOnDevice)
}

function* turnOffSaga() {
  yield takeLatest("CHANGE_POWER_MODE", sagas.turnOffDevice)
}

function* updateHomeAssistantSaga() {
  yield takeLatest("UPDATE_HOME_ASSISTANT", sagas.updateHomeAssistant)
}

function* checkDevicesStateSaga() {
  yield takeLatest("CHECK_DEVICES_STATE", sagas.checkDevicesState)
}

function* checkPsnPresenceSaga() {
  yield takeLatest("CHECK_PSN_PRESENCE", sagas.checkPsnPresence)
}

function* updateAccountSaga() {
  yield takeLatest("UPDATE_PSN_ACCOUNT", sagas.updateAccount)
}

function* persistPsnAccountSaga() {
  // takeEvery (not takeLatest): if two accounts update in quick succession,
  // takeLatest would cancel the first account's in-flight persistence before
  // it writes, silently dropping it. Every account's update must persist
  // regardless of timing.
  yield takeEvery(
    ["UPDATE_PSN_ACCOUNT", "PERSIST_PROVISIONAL_PSN_TOKENS"],
    sagas.persistPsnAccount,
  )
}

function* pollPs5StatesSaga() {
  yield takeLatest("POLL_DEVICES", function* pollingRace() {
    yield race({
      task: call(sagas.pollDevices),
      cancel: take("CHANGE_POWER_MODE"),
    })
  })
}

function* delayForTransitionSaga() {
  yield takeLatest("TRANSITIONING", sagas.delayForTransition)
}

function* saga() {
  yield all(
    [
      delayForTransitionSaga,
      discoverDevicesSaga,
      addDevicesSaga,
      turnOnSaga,
      turnOffSaga,
      updateHomeAssistantSaga,
      checkDevicesStateSaga,
      checkPsnPresenceSaga,
      pollPs5StatesSaga,
      pollDisoverySaga,
      pollPsnPresenceSaga,
      updateAccountSaga,
      persistPsnAccountSaga,
    ].map((saga) => fork(saga)),
  )
}

export default saga
