import createDebugger from "debug";
import lodash from "lodash";
import { getContext, put } from "redux-saga/effects";
import sh from "shelljs";
import { Settings, SETTINGS } from "../../services";
import { createErrorLogger } from "../../util/error-logger";
import { setTransitioning, updateHomeAssistant } from "../action-creators";
import type { ChangePowerModeAction } from "../types";

const debug = createDebugger("@ha:ps5:turnOffDevice");
const debugError = createErrorLogger();

function* turnOffDevice(action: ChangePowerModeAction) {
    const { credentialStoragePath }: Settings = yield getContext(SETTINGS);

    if (action.payload.mode !== 'STANDBY') {
        return;
    }

    yield put(
        setTransitioning(
            lodash.merge({}, action.payload.device, { transitioning: true })
        )
    );
    try {
        const { stdout, stderr } = sh.exec(
            `playactor standby --ip ${action.payload.device.address.address}`
            + ` --timeout 5000 --connect-timeout 5000 --no-open-urls --no-auth`
            + ` -c ${credentialStoragePath}`,
            { silent: true, timeout: 5000 }
        )

        if (stderr) {
            throw stderr;
        }
        debug(stdout);

        yield put(
            updateHomeAssistant({
                ...action.payload.device,
                status: "STANDBY",
                activity: undefined // also clear the activity when a device turns off
            })
        );
    } catch (e) {
        debugError(e);
    }
}

export { turnOffDevice };

