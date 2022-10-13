import { put, select } from "redux-saga/effects";

import { updateHomeAssistant } from "../action-creators";
import { getDeviceList } from "../selectors";
import type { Device, UpdateAccountAction } from "../types";

// handles changes in accounts and propegates them to devices state in the (Redux) store
function* updateAccount({ payload: account }: UpdateAccountAction) {
    const devices: Device[] = yield select(getDeviceList);

    let bestMatch: Device = undefined;

    // find best device match for activity
    if (account.activity !== undefined) {

        if(account.preferredDevices.ps5 !== undefined || account.preferredDevices.ps4 !== undefined) {
            devices.sort((a, _b) => {
                if(a.id === account.preferredDevices.ps5 || a.id === account.preferredDevices.ps4) {
                    return -1;
                } else {
                    return 1;
                }
            });
        }

        bestMatch = devices.find(d => d.status === 'AWAKE' && d.type === account.activity.launchPlatform);
        if (bestMatch !== undefined) {
            // if there already is an activity on that device add the player to the active player list
            if (bestMatch.activity !== undefined && !bestMatch.activity.activePlayers.includes(account.accountName)) {
                bestMatch.activity.activePlayers.push(account.accountName);
            }
            // otherwise add activity to matched device
            else {
                bestMatch.activity = {
                    ...account.activity,
                    activePlayers: [account.accountName]
                }
            }
        }
    }

    const devicesToUpdate: Device[] = bestMatch !== undefined ? [bestMatch] : [];

    // find any devices the player was recently active on except the bestMatch
    for (const device of devices.filter(d => d !== bestMatch && d.activity?.activePlayers?.includes(account.accountName))) {
        // remove player from player list
        if (device.activity.activePlayers.length > 1) {
            const accountIndex = device.activity.activePlayers.indexOf(account.accountName);
            device.activity.activePlayers.splice(accountIndex, 1);
        }
        // if player was the only player on activity clear activity in it's entirity
        else {
            device.activity = undefined;
        }
        devicesToUpdate.push(device);
    }

    for (const device of devicesToUpdate) {
        yield put(updateHomeAssistant(device));
    }
}

export { updateAccount };

