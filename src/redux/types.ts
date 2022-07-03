type Device = {
    id: string;
    name: string;
    transitioning: boolean;
    homeAssistantId: string;
    homeAssistantState: SwitchStatus;
    status: Ps5Status;
    address: {
        address: string;
        port: number;
    };
    systemVersion: string;
    available: boolean;
};

type Ps5Status = "STANDBY" | "AWAKE";
type SwitchStatus = Ps5Status | "UNKNOWN";

type DiscoverDevicesAction = {
    type: "DISCOVER_DEVICES";
};

type AddDeviceAction = {
    type: "ADD_DEVICE";
    payload: Device;
};

type RegisterDeviceWithHomeAssistantAction = {
    type: "REGISTER_DEVICE";
    payload: Device;
};

type UpdateHomeAssistantAction = {
    type: "UPDATE_HOME_ASSISTANT";
    payload: {
        device: Device;
    };
};

type ChangePowerModeAction = {
    type: "CHANGE_POWER_MODE";
    payload: {
        device: Device;
        mode: SwitchStatus;
    };
};

type SetTransitioningAction = {
    type: "TRANSITIONING";
    payload: { id: string; transitioning: boolean };
};

type UpdateDeviceAction = {
    type: "UPDATE_DEVICE";
    payload: Partial<Device> & { id: string };
};

type CheckDevicesStateAction = {
    type: "CHECK_DEVICES_STATE";
};

type PollDevicesAction = {
    type: "POLL_DEVICES";
};

type PollDiscoveryAction = {
    type: "POLL_DISCOVERY";
};

type AnyAction =
    | RegisterDeviceWithHomeAssistantAction
    | ChangePowerModeAction
    | AddDeviceAction
    | CheckDevicesStateAction
    | DiscoverDevicesAction
    | PollDevicesAction
    | PollDiscoveryAction
    | SetTransitioningAction
    | UpdateDeviceAction
    | UpdateHomeAssistantAction;

type State = {
    devices: Record<string, Device>;
};

export type {
    RegisterDeviceWithHomeAssistantAction,
    AnyAction,
    AddDeviceAction,
    ChangePowerModeAction as ApplyToDeviceAction,
    CheckDevicesStateAction,
    Device,
    DiscoverDevicesAction,
    SetTransitioningAction,
    PollDevicesAction,
    PollDiscoveryAction,
    Ps5Status,
    State,
    UpdateHomeAssistantAction,
    UpdateDeviceAction,
    SwitchStatus,
};
