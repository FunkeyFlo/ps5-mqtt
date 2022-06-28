import type {
    RegisterDeviceWithHomeAssistantAction,
    Device,
    DiscoverDevicesAction,
    UpdateHomeAssistantAction,
    SwitchStatus,
    ApplyToDeviceAction,
    CheckDevicesStateAction,
    PollDevicesAction,
    PollDiscoveryAction,
    AddDeviceAction,
    SetTransitioningAction,
} from "./types";

const discoverDevices = (): DiscoverDevicesAction => ({
    type: "DISCOVER_DEVICES",
});

const registerDeviceWithHomeAssistant = (
    device
): RegisterDeviceWithHomeAssistantAction => ({
    type: "REGISTER_DEVICE",
    payload: device,
});
const addDevice = (device): AddDeviceAction => ({
    type: "ADD_DEVICE",
    payload: device,
});

const applyToDevice = (device, onState: SwitchStatus): ApplyToDeviceAction => ({
    type: "APPLY_TO_DEVICE",
    payload: {
        device,
        on: onState,
    },
});

const checkDevicesState = (): CheckDevicesStateAction => ({
    type: "CHECK_DEVICES_STATE",
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

const updateHomeAssistant = (device: Device): UpdateHomeAssistantAction => ({
    type: "UPDATE_HOME_ASSISTANT",
    payload: { device },
});

export {
    addDevice,
    registerDeviceWithHomeAssistant,
    applyToDevice,
    checkDevicesState,
    setTransitioning,
    discoverDevices,
    pollDevices,
    pollDiscovery,
    updateHomeAssistant,
};
