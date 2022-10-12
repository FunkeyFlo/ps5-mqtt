import lodash from "lodash";
import { put, select } from "redux-saga/effects";
import { updateHomeAssistant } from "../action-creators";
import { getDeviceList } from "../selectors";
import type { Device, UpdateAccountAction } from "../types";

// handles changes in accounts and propegates them to devices state in the (Redux) store
function* updateAccount({ payload: account }: UpdateAccountAction) {
    const devices: Device[] = yield select(getDeviceList);

    // sammy bug occurs because all devices are used when matching activity
    // solution:
    // 1. find the user's preferred device, if it's on use that device to match activity
    // 2. if the user is active on any other device, remove them from that activity, etc.
    for (const device of devices) {
        const clonedDeviceState: Device = lodash.cloneDeep(device);

        const isAccountCurrentlyActiveOnDevice =
            clonedDeviceState.activity?.activePlayers.some(p => p === account.accountName);

        // the player is using an app that matches the current device's platform
        if (account.activity !== undefined && clonedDeviceState.type === account.activity.launchPlatform) {
            // mark activity as the new activity, extending player list in the process
            clonedDeviceState.activity = {
                ...account.activity,
                activePlayers: isAccountCurrentlyActiveOnDevice
                    ? clonedDeviceState?.activity?.activePlayers ?? []
                    : [...(clonedDeviceState.activity?.activePlayers ?? []), account.accountName],
            }
        }
        // the player was recently marked as using an app on the current device but is no longer using an app.
        else if (isAccountCurrentlyActiveOnDevice && account.activity === undefined) {
            const activePlayers = clonedDeviceState.activity?.activePlayers ?? [];
            if (activePlayers.length > 1 && clonedDeviceState.activity !== undefined) {
                // remove current player from the player list
                clonedDeviceState.activity.activePlayers =
                    activePlayers.filter(p => p !== account.accountName);
            } else {
                // no players = no activity
                clonedDeviceState.activity = undefined;
            }
        }

        // only apply update if something actually changed
        if (!lodash.isEqual(device, clonedDeviceState)) {
            yield put(updateHomeAssistant(clonedDeviceState));
            return;
        }
    }
}

export { updateAccount };

