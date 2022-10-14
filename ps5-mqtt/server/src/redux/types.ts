import { Playstation } from "../device";
import { PsnAccount } from "../psn-account";

export type Device = Playstation & DeviceState & {
    normalizedName: string
};

export type Account = PsnAccount & {
    preferredDevices: {
        ps4?: string,
        ps5?: string,
    }
}

export type DeviceState = {
    status: SwitchStatus;
    available: boolean;

    activity?: PsnAccount.AccountActivity & {
        activePlayers: string[];
    };
}

export type Ps5Status = "STANDBY" | "AWAKE";
export type SwitchStatus = Ps5Status | "UNKNOWN";

export type DiscoverDevicesAction = {
    type: "DISCOVER_DEVICES";
};

export type AddDeviceAction = {
    type: "ADD_DEVICE";
    payload: Device;
};

export type RegisterDeviceAction = {
    type: "REGISTER_DEVICE";
    payload: Device;
};

export type UpdateHomeAssistantAction = {
    type: "UPDATE_HOME_ASSISTANT";
    payload: Device;
};

export type ChangePowerModeAction = {
    type: "CHANGE_POWER_MODE";
    payload: {
        device: Device;
        mode: SwitchStatus;
    };
};

export type SetTransitioningAction = {
    type: "TRANSITIONING";
    payload: { id: string; transitioning: boolean };
};

export type UpdateDeviceAction = {
    type: "UPDATE_DEVICE";
    payload: Partial<Device> & { id: string };
};

export type CheckDevicesStateAction = {
    type: "CHECK_DEVICES_STATE";
};

export type CheckPsnPresenceAction = {
    type: "CHECK_PSN_PRESENCE";
};

export type PersistDevicesAction = {
    type: "PERSIST_DEVICES";
    payload: Record<string, Device>;
};

export type PollDevicesAction = {
    type: "POLL_DEVICES";
};

export type PollDiscoveryAction = {
    type: "POLL_DISCOVERY";
};

export type PollPsnPresenceAction = {
    type: "POLL_PSN_PRESENCE";
};

export type UpdateAccountAction = {
    type: "UPDATE_PSN_ACCOUNT";
    payload: Account;
}

export type AnyAction =
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

export type State = {
    devices: Record<string, Device>;
    accounts: Record<string, Account>;
};
