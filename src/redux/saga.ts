import { all, call, fork, race, take, takeLatest } from "redux-saga/effects";
import * as sagas from "./sagas";

function* discoverDevicesSaga() {
    yield takeLatest("DISCOVER_DEVICES", sagas.discoverDevices);
}

function* pollDisoverySaga() {
    yield takeLatest("POLL_DISCOVERY", sagas.pollDisovery);
}

function* addDevicesSaga() {
    yield takeLatest("REGISTER_DEVICE", sagas.registerWithHomeAssistant);
}

function* turnOnSaga() {
    yield takeLatest("APPLY_TO_DEVICE", sagas.turnOnDevice);
}

function* turnOffSaga() {
    yield takeLatest("APPLY_TO_DEVICE", sagas.turnOffDevice);
}

function* updateHomeAssistantSaga() {
    yield takeLatest("UPDATE_HOME_ASSISTANT", sagas.updateHomeAssistant);
}

function* checkDevicesStateSaga() {
    yield takeLatest("CHECK_DEVICES_STATE", sagas.checkDevicesState);
}

function* pollPs5StatesSaga() {
    yield takeLatest("POLL_DEVICES", function* pollingRace() {
        yield race({
            task: call(sagas.pollDevices),
            cancel: take("APPLY_TO_DEVICE"),
        });
    });
}

function* delayForTransitionSaga() {
    yield takeLatest("TRANSITIONING", sagas.delayForTransition);
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
            pollPs5StatesSaga,
            pollDisoverySaga,
        ].map((saga) => fork(saga))
    );
}

export default saga;
