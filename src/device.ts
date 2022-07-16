export interface Playstation5 {
    id: string;
    name: string;
    transitioning: boolean;
    address: {
        address: string;
        port: number;
    };
    systemVersion: string;
}
