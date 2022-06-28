import createDebugger from "debug";
import { merge } from "lodash";
import { put } from "redux-saga/effects";
import sh from "shelljs";
import { setTransitioning, updateHomeAssistant } from "../action-creators";
import type { ApplyToDeviceAction } from "../types";

const debug = createDebugger("@ha/ps5/turnOffDevice");

function* turnOffDevice(action: ApplyToDeviceAction) {
    if (action.payload.on !== "OFF") {
        return;
    }

    yield put(
        setTransitioning(
            merge({}, action.payload.device, { transitioning: true })
        )
    );
    yield put(
        updateHomeAssistant(
            merge({}, action.payload.device, { status: "STANDBY" })
        )
    );
    debug(
        sh.exec(
            `playactor standby --ip ${action.payload.device.address.address}`
        )
    );
}

export { turnOffDevice };

