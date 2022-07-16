import createDebugger from "debug";
import { merge } from "lodash";
import { put } from "redux-saga/effects";
import sh from "shelljs";
import { createErrorLogger } from "../../util/error-logger";
import { setTransitioning, updateHomeAssistant } from "../action-creators";
import type { ChangePowerModeAction } from "../types";

const debug = createDebugger("@ha:ps5:turnOnDevice");
const debugError = createErrorLogger();

function* turnOnDevice(action: ChangePowerModeAction) {
    if (action.payload.mode !== 'AWAKE') {
        return;
    }

    yield put(
        setTransitioning(
            merge({}, action.payload.device, { transitioning: true })
        )
    );
    try {
        const { stdout, stderr } = sh.exec(
            `playactor wake --ip ${action.payload.device.address.address}`
            + ` --timeout 15000 --connect-timeout 10000`,
            { silent: true, timeout: 15000 }
        );

        if (stderr) {
            throw stderr;
        }
        debug(stdout);

        yield put(
            updateHomeAssistant(
                merge({}, action.payload.device, { status: "AWAKE" })
            )
        );
    } catch (e) {
        debugError(e);
    }
}

export { turnOnDevice };

