import createDebugger from "debug";
import { merge } from "lodash";
import { put, select } from "redux-saga/effects";
import sh from "shelljs";
import { createErrorLogger } from "../../util/error-logger";
import { updateHomeAssistant } from "../action-creators";
import { getDeviceList } from "../selectors";
import type { Device, DeviceState } from "../types";

const debug = createDebugger("@ha:ps5:checkDevicesState");
const errorLogger = createErrorLogger();

function* checkDevicesState() {
    const devices: Device[] = yield select(getDeviceList);
    for (const device of devices) {
        try {
            const shellOutput = sh.exec(
                `playactor check --host-name ${device.name} --machine-friendly --ps5`
                + ` --timeout 15000 --connect-timeout 10000 --no-open-urls --no-auth`,
                { silent: true, timeout: 15000 }
            );
            const updatedDevice: Device = JSON.parse(shellOutput.stdout);
            if (
                device.transitioning
            ) {
                debug(
                    "Device is transitioning",
                    device.transitioning,
                    updatedDevice.status
                );
                break;
            }

            // only send updates if device is truly changing states or when device has become available
            if (device.status !== updatedDevice.status || !device.available) {
                debug("Update HA");
                yield put(
                    updateHomeAssistant(
                        merge(
                            {},
                            device,
                            <DeviceState>{
                                status: updatedDevice.status,
                                available: true
                            }
                        )
                    )
                );
            }
        } catch (e) {
            // previously available device cannot be located
            yield put(
                updateHomeAssistant(
                    merge(
                        {},
                        device,
                        <DeviceState>{
                            status: "UNKNOWN",
                            available: false
                        }
                    )
                )
            );

            errorLogger(e);
        }
    }
}

export { checkDevicesState };

