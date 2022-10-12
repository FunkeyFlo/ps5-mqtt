export interface Playstation {
    id: string;
    name: string;
    transitioning: boolean;
    address: {
        address: string;
        port: number;
    };
    systemVersion: string;
    type: "PS4" | "PS5"
}
