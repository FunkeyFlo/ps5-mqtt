import type {
    RegisterDeviceAction,
    Device,
    DiscoverDevicesAction,
    UpdateHomeAssistantAction,
    SwitchStatus,
    ChangePowerModeAction,
    CheckDevicesStateAction,
    PollDevicesAction,
    PollDiscoveryAction,
    AddDeviceAction,
    SetTransitioningAction,
    CheckPsnPresenceAction,
    PollPsnPresenceAction,
    UpdateAccountAction,
    Account,
} from "./types";

const discoverDevices = (): DiscoverDevicesAction => ({
    type: "DISCOVER_DEVICES",
});

const registerDevice = (
    device: Device
): RegisterDeviceAction => ({
    type: "REGISTER_DEVICE",
    payload: device,
});

const addDevice = (device: Device): AddDeviceAction => ({
    type: "ADD_DEVICE",
    payload: device,
});

const setPowerMode = (device, onState: SwitchStatus): ChangePowerModeAction => ({
    type: "CHANGE_POWER_MODE",
    payload: {
        device,
        mode: onState,
    },
});

const checkDevicesState = (): CheckDevicesStateAction => ({
    type: "CHECK_DEVICES_STATE",
});

const checkPsnPresence = (): CheckPsnPresenceAction => ({
    type: "CHECK_PSN_PRESENCE",
});

const setTransitioning = (device: {
    id: string;
    transitioning: boolean;
}): SetTransitioningAction => ({
    type: "TRANSITIONING",
    payload: device,
});

const pollDevices = (): PollDevicesAction => ({
    type: "POLL_DEVICES",
});

const pollDiscovery = (): PollDiscoveryAction => ({
    type: "POLL_DISCOVERY",
});

const pollPsnPresence = (): PollPsnPresenceAction => ({
    type: "POLL_PSN_PRESENCE",
});

const updateHomeAssistant = (device: Device): UpdateHomeAssistantAction => ({
    type: "UPDATE_HOME_ASSISTANT",
    payload: device,
});

const updateAccount = (account: Account): UpdateAccountAction => ({
    type: 'UPDATE_PSN_ACCOUNT',
    payload: account,
})

export {
    addDevice,
    registerDevice,
    setPowerMode,
    checkDevicesState,
    setTransitioning,
    discoverDevices,
    pollDevices,
    pollDiscovery,
    updateHomeAssistant,
    checkPsnPresence,
    pollPsnPresence,
    updateAccount,
};
