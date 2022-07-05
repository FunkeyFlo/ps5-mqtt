import createDebugger from "debug";
import { merge } from "lodash";
import { put, select } from "redux-saga/effects";
import sh from "shelljs";
import { createErrorLogger } from "../../util/error-logger";
import { updateHomeAssistant } from "../action-creators";
import { getDevices } from "../selectors";
import type { Device } from "../types";

const debug = createDebugger("@ha:ps5:checkDevicesState");
const errorLogger = createErrorLogger();

function* checkDevicesState() {
    const devices: Device[] = yield select(getDevices);
    for (const device of devices) {
        const shellOutput = sh.exec(
            `playactor check --host-name ${device.name}`,
            { silent: true }
        );
        try {
            const updatedDevice = JSON.parse(shellOutput.stdout);
            if (
                device.transitioning &&
                device.homeAssistantState !==
                updatedDevice.status
            ) {
                debug(
                    "Device is transitioning",
                    device.transitioning,
                    device.homeAssistantState,
                    updatedDevice.status
                );
                break;
            }

            // only send updates if device is truly changing states
            if (device.homeAssistantState !== updatedDevice.status) {
                debug("Update HA");
                yield put(
                    updateHomeAssistant(
                        merge({}, device, { status: updatedDevice.status })
                    )
                );
            }
        } catch (e) {
            // previously available device cannot be located

            errorLogger(e);
        }
    }
}

export { checkDevicesState };

