import createDebugger from "debug";
import { merge } from "lodash";
import { getContext, put, select } from "redux-saga/effects";
import sh from "shelljs";
import { Settings, SETTINGS } from "../../services";
import { createErrorLogger } from "../../util/error-logger";
import { updateHomeAssistant } from "../action-creators";
import { getDeviceList } from "../selectors";
import type { Device, DeviceState } from "../types";

const debug = createDebugger("@ha:ps5:checkDevicesState");
const errorLogger = createErrorLogger();

function* checkDevicesState() {
    const { credentialStoragePath }: Settings = yield getContext(SETTINGS);

    const devices: Device[] = yield select(getDeviceList);
    for (const ps5 of devices) {
        try {
            const shellOutput = sh.exec(
                `playactor check --host-name "${ps5.name}" --machine-friendly --ps5`
                + ` --timeout 15000 --connect-timeout 10000 --no-open-urls --no-auth`
                + ` -c ${credentialStoragePath}`,
                { silent: true, timeout: 15000 }
            );
            const updatedDevice: Device = JSON.parse(shellOutput.stdout);
            if (
                ps5.transitioning
            ) {
                debug(
                    "Device is transitioning",
                    ps5.transitioning,
                    updatedDevice.status
                );
                break;
            }

            // only send updates if ps5 is truly changing states or when ps5 has become available
            if (ps5.status !== updatedDevice.status || !ps5.available) {
                debug("Update HA");
                yield put(
                    updateHomeAssistant(
                        merge(
                            {},
                            ps5,
                            <DeviceState>{
                                status: updatedDevice.status,
                                available: true
                            }
                        )
                    )
                );
            }
        } catch (e) {
            // previously available ps5 cannot be located
            yield put(
                updateHomeAssistant(
                    merge(
                        {},
                        ps5,
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

