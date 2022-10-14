import { Playstation } from "../device";
import { PsnAccount } from "../psn-account";

type Device = Playstation & DeviceState & {
    normalizedName: string
};

type DeviceState = {
    status: SwitchStatus;
    available: boolean;

    activity?: PsnAccount.AccountActivity & {
        activePlayers: string[];
    };
}

type Ps5Status = "STANDBY" | "AWAKE";
type SwitchStatus = Ps5Status | "UNKNOWN";

type DiscoverDevicesAction = {
    type: "DISCOVER_DEVICES";
};

type AddDeviceAction = {
    type: "ADD_DEVICE";
    payload: Device;
};

type RegisterDeviceAction = {
    type: "REGISTER_DEVICE";
    payload: Device;
};

type UpdateHomeAssistantAction = {
    type: "UPDATE_HOME_ASSISTANT";
    payload: Device;
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

type CheckPsnPresenceAction = {
    type: "CHECK_PSN_PRESENCE";
};

type PersistDevicesAction = {
    type: "PERSIST_DEVICES";
    payload: Record<string, Device>;
};

type PollDevicesAction = {
    type: "POLL_DEVICES";
};

type PollDiscoveryAction = {
    type: "POLL_DISCOVERY";
};

type PollPsnPresenceAction = {
    type: "POLL_PSN_PRESENCE";
};

type UpdateAccountAction = {
    type: "UPDATE_PSN_ACCOUNT";
    payload: PsnAccount;
}

type AnyAction =
    | RegisterDeviceAction
    | PersistDevicesAction
    | ChangePowerModeAction
    | AddDeviceAction
    | CheckDevicesStateAction
    | DiscoverDevicesAction
    | PollDevicesAction
    | PollDiscoveryAction
    | SetTransitioningAction
    | UpdateDeviceAction
    | UpdateHomeAssistantAction
    | CheckPsnPresenceAction
    | PollPsnPresenceAction
    | UpdateAccountAction
    ;

type State = {
    devices: Record<string, Device>;
    accounts: Record<string, PsnAccount>;
};

export type {
    RegisterDeviceAction,
    AnyAction,
    AddDeviceAction,
    PersistDevicesAction,
    ChangePowerModeAction,
    CheckDevicesStateAction,
    Device,
    DeviceState,
    DiscoverDevicesAction,
    SetTransitioningAction,
    PollDevicesAction,
    PollDiscoveryAction,
    Ps5Status,
    State,
    UpdateHomeAssistantAction,
    UpdateDeviceAction,
    SwitchStatus,
    UpdateAccountAction,
    CheckPsnPresenceAction,
    PollPsnPresenceAction,
};
