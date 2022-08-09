import { cloneDeep, isEqual } from "lodash";
import { put, select } from "redux-saga/effects";
import { updateHomeAssistant } from "../action-creators";
import { getDeviceList } from "../selectors";
import type { Device, UpdateAccountAction } from "../types";


// handles changes in accounts and propegates them to devices state in the (Redux) store
function* updateAccount({ payload: account }: UpdateAccountAction) {
    const devices: Device[] = yield select(getDeviceList);

    for (const device of devices) {
        const clonedDeviceState: Device = cloneDeep(device);

        const isAccountCurrentlyActiveOnDevice = 
            clonedDeviceState.activity?.activePlayers.some(p => p === account.accountName);

        // the player is using an app that matches the current device's platform
        if (account.activity !== undefined && clonedDeviceState.type === account.activity.platform) {
            // mark activity as the new activity, extending player list in the process
            clonedDeviceState.activity = {
                ...account.activity,
                activePlayers: isAccountCurrentlyActiveOnDevice
                    ? clonedDeviceState.activity.activePlayers
                    : [...(clonedDeviceState.activity?.activePlayers ?? []), account.accountName],
            }
        }
        // the player was recently marked as using an app on the current device but is no longer using an app.
        else if (isAccountCurrentlyActiveOnDevice && account.activity === undefined) {
            if (clonedDeviceState.activity.activePlayers.length > 1) {
                // remove current player from the player list
                clonedDeviceState.activity.activePlayers = 
                    clonedDeviceState.activity.activePlayers.filter(p => p !== account.accountName);
            } else {
                // no players = no activity
                clonedDeviceState.activity = undefined;
            }
        }

        // only apply update if something actually changed
        if (!isEqual(device, clonedDeviceState)) {
            yield put(updateHomeAssistant(clonedDeviceState));
        }
    }
}

export { updateAccount };

