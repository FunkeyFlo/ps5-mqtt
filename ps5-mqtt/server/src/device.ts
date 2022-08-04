import { DeviceType } from "playactor/dist/discovery/model";

export interface Playstation {
    id: string;
    name: string;
    transitioning: boolean;
    address: {
        address: string;
        port: number;
    };
    systemVersion: string;
    type: DeviceType
}
