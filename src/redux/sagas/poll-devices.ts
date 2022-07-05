import { delay, put } from "redux-saga/effects";
import { createErrorLogger } from "../../util/error-logger";
import { checkDevicesState } from "../action-creators";

const { DEVICE_CHECK_INTERVAL } = process.env;
const deviceCheckInterval = parseInt(DEVICE_CHECK_INTERVAL || "1000", 10);

const debugError = createErrorLogger();

function* pollDevices() {
    while (true) {
        try {
            yield put(checkDevicesState());
            yield delay(deviceCheckInterval);
        } catch (e) {
            debugError(e);
        }
    }
}

export { pollDevices };

