
import { delay, getContext, put, select } from "redux-saga/effects";
import { Settings, SETTINGS } from "../../services";
import { createErrorLogger } from "../../util/error-logger";
import { checkPsnPresence } from "../action-creators";
import { getDeviceList } from "../selectors";
import { Device } from "../types";

const debugError = createErrorLogger();

function* pollPsnPresence() {
    const { checkAccountInterval }: Settings = yield getContext(SETTINGS);

    while (true) {
        try {
            const devices: Device[] = yield select(getDeviceList);

            // no need to check accounts if no devices are turned on
            if (devices.some(d => d.status === 'AWAKE')) {
                yield put(checkPsnPresence());
            }
            
            yield delay(checkAccountInterval);
        } catch (e) {
            debugError(e);
        }
    }
}

export { pollPsnPresence };

