
import { delay, put } from "redux-saga/effects";
import { createErrorLogger } from "../../util/error-logger";
import { discoverDevices } from "../action-creators";

const debugError = createErrorLogger();

function* pollDisovery() {
    while (true) {
        try {
            yield put(discoverDevices());
            yield delay(300000);
        } catch (e) {
            debugError(e);
        }
    }
}

export { pollDisovery };

