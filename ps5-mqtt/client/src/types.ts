export interface Stats {
    mqttInfo: {
        clientId: string;
    };
}

export interface DiscoveryResponse {
    devices: IDevice[];
}

export interface IDevice {
    id: string;
    name: string;
    status: 'AWAKE' | 'STANDBY';
}

export interface ILogger {
    log(message: unknown): void;
    error(message: unknown): void;
}

export interface IMessage {
    type: 'error' | 'info',
    value: string;
}