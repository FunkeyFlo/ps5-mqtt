import createDebugger from "debug";
import { stdout } from "process";
import { getContext, put, select } from "redux-saga/effects";
import sh from "shelljs";
import { Settings, SETTINGS } from "../../services";
import { createErrorLogger } from "../../util/error-logger";
import { updateHomeAssistant } from "../action-creators";
import { getDeviceList } from "../selectors";
import type { Device } from "../types";

const debug = createDebugger("@ha:ps5:checkDevicesState");
const errorLogger = createErrorLogger();

function* checkDevicesState() {
    const { credentialStoragePath }: Settings = yield getContext(SETTINGS);

    const devices: Device[] = yield select(getDeviceList);
    for (const device of devices) {
        try {
            const { stdout, stderr } = sh.exec(
                `playactor check --ip ${device.address.address} --machine-friendly`
                + ` --timeout 15000 --connect-timeout 10000 --no-open-urls --no-auth`
                + ` -c ${credentialStoragePath}`,
                { silent: true, timeout: 15000 }
            );

            if (stderr) {
                throw new Error(stderr)
            }

            const updatedDevice: Device = JSON.parse(stdout);

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

            // only send updates if ps5 is truly changing states or when ps5 has become available
            if (device.status !== updatedDevice.status || !device.available) {
                debug("Update HA");
                yield put(
                    updateHomeAssistant({
                        ...device,
                        status: updatedDevice.status,
                        activity: updatedDevice.status !== 'AWAKE'
                            ? undefined
                            : updatedDevice.activity,
                        available: true,
                    })
                );
            }
        } catch (e) {
            // previously available ps5 cannot be located
            yield put(
                updateHomeAssistant({
                    ...device,
                    status: "UNKNOWN",
                    available: false,
                    activity: undefined,
                })
            );

            errorLogger(e);
        }
    }
}

export { checkDevicesState };

