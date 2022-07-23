
import { delay, getContext, put } from "redux-saga/effects";
import { Settings, SETTINGS } from "../../services";
import { createErrorLogger } from "../../util/error-logger";
import { discoverDevices } from "../action-creators";

const debugError = createErrorLogger();

function* pollDisovery() {
    const settings: Settings = yield getContext(SETTINGS);

    while (true) {
        try {
            yield put(discoverDevices());
            yield delay(settings.discoverDevicesInterval);
        } catch (e) {
            debugError(e);
        }
    }
}

export { pollDisovery };

