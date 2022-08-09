
import { delay, getContext, put } from "redux-saga/effects";
import { Settings, SETTINGS } from "../../services";
import { createErrorLogger } from "../../util/error-logger";
import { discoverDevices } from "../action-creators";

const debugError = createErrorLogger();

function* pollDisovery() {
    const { discoverDevicesInterval }: Settings = yield getContext(SETTINGS);

    while (true) {
        try {
            yield put(discoverDevices());
            yield delay(discoverDevicesInterval);
        } catch (e) {
            debugError(e);
        }
    }
}

export { pollDisovery };

