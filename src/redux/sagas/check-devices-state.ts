import createDebugger from "debug";
import { merge } from "lodash";
import { put, select } from "redux-saga/effects";
import sh from "shelljs";
import { updateHomeAssistant } from "../action-creators";
import { getDevices, getStateMappings } from "../selectors";
import type { Device } from "../types";

const debug = createDebugger("@ha/ps5/checkDevicesState");

function* checkDevicesState() {
    const devices: Device[] = yield select(getDevices);
    const stateMappings = yield select(getStateMappings);
    for (const device of devices) {
        const shellOutput = sh.exec(
            `playactor check --host-name ${device.name}`
        );
        try {
            const updatedDevice = JSON.parse(shellOutput.stdout);
            if (
                device.transitioning &&
                device.homeAssistantState !==
                    stateMappings[updatedDevice.status]
            ) {
                debug(
                    "Device is transitioning",
                    device.transitioning,
                    device.homeAssistantState,
                    updatedDevice.status
                );
                break;
            }

            debug("Update HA");
            yield put(
                updateHomeAssistant(
                    merge({}, device, { status: updatedDevice.status })
                )
            );
        } catch (e) {
            debug(e);
        }
    }
}

export { checkDevicesState };

