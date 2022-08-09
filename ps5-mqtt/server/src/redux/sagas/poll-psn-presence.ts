
import { delay, put } from "redux-saga/effects";
import { createErrorLogger } from "../../util/error-logger";
import { checkPsnPresence } from "../action-creators";

const debugError = createErrorLogger();

function* pollPsnPresence() {
    while (true) {
        try {
            // TODO: only poll if there are AWAKE devices
            yield put(checkPsnPresence());
            yield delay(5000);
        } catch (e) {
            debugError(e);
        }
    }
}

export { pollPsnPresence };

