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
  yield takeEvery("REGISTER_DEVICE", sagas.registerDevice)
}

function* turnOnSaga() {
  yield takeEvery("CHANGE_POWER_MODE", sagas.turnOnDevice)
}

function* turnOffSaga() {
  yield takeEvery("CHANGE_POWER_MODE", sagas.turnOffDevice)
}

function* updateHomeAssistantSaga() {
  yield takeEvery("UPDATE_HOME_ASSISTANT", sagas.updateHomeAssistant)
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

function* registerAccountSaga() {
  yield takeEvery("REGISTER_PSN_ACCOUNT", sagas.registerAccount)
}

function* publishAccountPresenceSaga() {
  // takeEvery: each account's publish is independent and must not cancel
  // another account's in-flight publish
  yield takeEvery(
    ["UPDATE_PSN_ACCOUNT", "PSN_PRESENCE_UNAVAILABLE"],
    sagas.publishAccountPresence,
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
  yield takeEvery("TRANSITIONING", sagas.delayForTransition)
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
      registerAccountSaga,
      publishAccountPresenceSaga,
      persistPsnAccountSaga,
    ].map((saga) => fork(saga)),
  )
}

export default saga
