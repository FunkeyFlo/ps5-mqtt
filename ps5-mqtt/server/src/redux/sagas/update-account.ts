import { put, select } from "redux-saga/effects";
import { updateHomeAssistant } from "../action-creators";
import { getDeviceList } from "../selectors";
import type { Device, UpdateAccountAction } from "../types";


// handles changes in accounts and propegates them to devices state in the (Redux) store
function* updateAccount({ payload: account }: UpdateAccountAction) {
    const devices: Device[] = yield select(getDeviceList);

    for (const device of devices) {
        const isAccountCurrentlyActiveOnDevice = device.activity?.activePlayers.some(p => p === account.accountName);

        // the player is using an app that matches the current device's platform
        if (account.activity !== undefined && device.type === account.activity.platform) {
            device.activity = {
                ...account.activity,
                activePlayers: isAccountCurrentlyActiveOnDevice 
                    ? device.activity.activePlayers 
                    :  [...(device.activity?.activePlayers ?? []), account.accountName ]
            }

            // mark activity as the new activity, extending player list in the process
            yield put(updateHomeAssistant({
                ...device,
                activity: {
                    ...account.activity,
                    activePlayers: isAccountCurrentlyActiveOnDevice 
                        ? device.activity.activePlayers 
                        :  [...(device.activity?.activePlayers ?? []), account.accountName ],
                }
            }))
        } 
        // the player was recently marked as using an app on the current device but is no longer using an app.
        else if(isAccountCurrentlyActiveOnDevice && account.activity === undefined) {
            if(device.activity.activePlayers.length > 1) {
                // remove current player from the player list
                yield put(updateHomeAssistant({
                    ...device,
                    activity: {
                        ...device.activity,
                        activePlayers: device.activity.activePlayers.filter(p => p !== account.accountName),
                    },
                }));
            } else {
                // no players = no activity
                yield put(updateHomeAssistant({
                    ...device,
                    activity: undefined,
                }));
            }
        }  
    }
}

export { updateAccount };

