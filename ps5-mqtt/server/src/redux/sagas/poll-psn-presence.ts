
import { delay, getContext, put } from "redux-saga/effects";
import { Settings, SETTINGS } from "../../services";
import { createErrorLogger } from "../../util/error-logger";
import { checkPsnPresence } from "../action-creators";

const debugError = createErrorLogger();

function* pollPsnPresence() {
    const { checkAccountInterval }: Settings = yield getContext(SETTINGS);

    while (true) {
        try {
            // TODO: only poll if there are AWAKE devices
            yield put(checkPsnPresence());
            yield delay(checkAccountInterval);
        } catch (e) {
            debugError(e);
        }
    }
}

export { pollPsnPresence };

