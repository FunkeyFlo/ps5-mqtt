import type { DiscoveryResponse, IDevice, ILogger, Stats } from "./types";

export default class Api {

    constructor(private readonly logger: ILogger) { }

    async connectToDevice(device: IDevice, pin: string, url: string): Promise<string> {
        try {
            const res = await fetch('api/connect', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    device,
                    pin,
                    url
                })
            });
            if (res.status >= 400 && res.status < 600) {
                this.logger.error(await res.text());
            } else {
                return await res.text()
            }
        } catch (e) {
            this.logger.error(e);
        }
    }

    async acquireAuthenticationLink(device: IDevice): Promise<string | undefined> {
        try {
            const res = await fetch('api/acquire-authentication-link', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    device
                })
            });
            if (res.status >= 400 && res.status < 600) {
                this.logger.error(await res.text());
            } else {
                return await res.text()
            }
        } catch (e) {
            this.logger.error(e);
        }
    }

    async getStats(): Promise<Stats | undefined> {
        try {
            const res = await fetch('api/stats', {
                method: 'GET'
            });
            return await res.json();
        } catch (e) {
            this.logger.error(e);
            return undefined;
        }
    }

    async getDevices(): Promise<IDevice[] | undefined> {
        try {
            const res = await fetch('api/discover', {
                method: 'GET'
            });
            return (await res.json() as DiscoveryResponse)?.devices;
        } catch (e) {
            this.logger.error(e);
            return undefined;
        }
    }

}