import createDebugger from "debug";
import { delay, put } from "redux-saga/effects";
import { discoverDevices } from "../action-creators";

const debug = createDebugger("@ha/ps5/pollDevicess");

function* pollDisovery() {
    while (true) {
        try {
            yield put(discoverDevices());
            yield delay(300000);
        } catch (e) {
            debug(e);
        }
    }
}

export { pollDisovery };

