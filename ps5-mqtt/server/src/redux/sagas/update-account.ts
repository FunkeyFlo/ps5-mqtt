import { put, select } from "redux-saga/effects";
import { updateHomeAssistant } from "../action-creators";
import { getDeviceList } from "../selectors";
import type { Device, UpdateAccountAction } from "../types";


// handles changes in accounts and propegates them to devices state in the (Redux) store
function* updateAccount({ payload: account }: UpdateAccountAction) {

    const devices: Device[] = yield select(getDeviceList);

    for (const device of devices) {
        const isAccountCurrentlyActiveOnDevice = device.activity?.activePlayers.some(p => p === account.accountName);

        if (account.activity !== undefined && device.type === account.activity.platform) {
            device.activity = {
                ...account.activity,
                activePlayers: isAccountCurrentlyActiveOnDevice 
                    ? device.activity.activePlayers 
                    :  [...(device.activity?.activePlayers ?? []), account.accountName ]
            }

            // TODO: Check if this doesn't update the device every time
            yield put(updateHomeAssistant({
                ...device,
                activity: {
                    ...account.activity,
                    activePlayers: isAccountCurrentlyActiveOnDevice 
                        ? device.activity.activePlayers 
                        :  [...(device.activity?.activePlayers ?? []), account.accountName ]
                }
            }))
        } else if(isAccountCurrentlyActiveOnDevice && account.activity === undefined) {
            // TODO: check if this causes problems when account is active on multiple consoles
            // TODO: check if this doesnt remove an existing user
            yield put(updateHomeAssistant({
                ...device,
                activity: undefined
            }))
        }  
    }
}

export { updateAccount };

