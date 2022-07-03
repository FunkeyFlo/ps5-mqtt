import createDebugger from "debug";
import { delay, put } from "redux-saga/effects";
import { checkDevicesState } from "../action-creators";

const debug = createDebugger("@ha:ps5:pollDevices");
let callCount = 0;
function* pollDevices() {
    while (true) {
        try {
            debug(callCount++);
            yield put(checkDevicesState());
            yield delay(1000);
        } catch (e) {
            debug(e);
        }
    }
}

export { pollDevices };

