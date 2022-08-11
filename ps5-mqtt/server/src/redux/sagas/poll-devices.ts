import { delay, getContext, put } from "redux-saga/effects";
import { Settings, SETTINGS } from "../../services";
import { createErrorLogger } from "../../util/error-logger";
import { checkDevicesState } from "../action-creators";

const debugError = createErrorLogger();

function* pollDevices() {
    const { checkDevicesInterval }: Settings = yield getContext(SETTINGS);

    while (true) {
        try {
            yield put(checkDevicesState());
            yield delay(checkDevicesInterval);
        } catch (e) {
            debugError(e);
        }
    }
}

export { pollDevices };

