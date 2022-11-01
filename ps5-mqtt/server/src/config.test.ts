import fs from 'fs';

import { AppConfig, getAppConfig } from './config';

jest.mock('fs');

const mockedReadFileSync = (fs as jest.Mocked<typeof fs>).readFileSync;
const mockedExistsSync = (fs as jest.Mocked<typeof fs>).existsSync;

describe("Configuration", () => {

    beforeEach(() => {
        jest.clearAllMocks();
    });

    test("correctly parses configuration file when no environment variables are specified", () => {
        process.env['CONFIG_PATH'] = "./dummy-file-path";

        mockedExistsSync.mockReturnValue(true);
        mockedReadFileSync.mockReturnValue(JSON.stringify(<AppConfig>{
            mqtt: {
                host: 'core-mosquitto',
                port: '1883',
                pass: 'REDACTED',
                user: 'addons'
            },
            logger: '@ha:ps5:*,@ha:ps5-sensitive:*',
            device_check_interval: 5000,
            device_discovery_interval: 60000,
            account_check_interval: 5000,
            include_ps4_devices: true,
            device_discovery_broadcast_address: '255.255.255.255',
            psn_accounts: [
                {
                    username: 'REDACTED',
                    npsso: 'REDACTED'
                }
            ],
            credentialsStoragePath: '/config/ps5-mqtt/credentials.json',
            frontendPort: '62428'
        }));

        const config = getAppConfig();

        expect(config).toEqual(<AppConfig>{
            mqtt: {
                host: 'core-mosquitto',
                port: '1883',
                pass: 'REDACTED',
                user: 'addons'
            },
            logger: '@ha:ps5:*,@ha:ps5-sensitive:*',
            device_check_interval: 5000,
            device_discovery_interval: 60000,
            account_check_interval: 5000,
            include_ps4_devices: true,
            device_discovery_broadcast_address: '255.255.255.255',
            psn_accounts: [
                {
                    username: 'REDACTED',
                    npsso: 'REDACTED'
                }
            ],
            credentialsStoragePath: '/config/ps5-mqtt/credentials.json',
            frontendPort: '62428'
        });
    });

    test("correctly merges environment variables and configuration file", () => {
        process.env['CONFIG_PATH'] = "./dummy-file-path";
        process.env['INCLUDE_PS4_DEVICES'] = "false"

        mockedExistsSync.mockReturnValue(true);
        mockedReadFileSync.mockReturnValue(JSON.stringify(<Partial<AppConfig>>{
            mqtt: {
                host: 'core-mosquitto',
                port: '1883',
                pass: 'REDACTED',
                user: 'addons'
            },
            logger: '@ha:ps5:*,@ha:ps5-sensitive:*',
            device_check_interval: 5000,
            device_discovery_interval: 60000,
            account_check_interval: 5000,
            psn_accounts: [
                {
                    username: 'REDACTED',
                    npsso: 'REDACTED'
                }
            ],
            credentialsStoragePath: '/config/ps5-mqtt/credentials.json',
            frontendPort: '62428'
        }));

        const config = getAppConfig();

        expect(config).toEqual(<AppConfig>{
            mqtt: {
                host: 'core-mosquitto',
                port: '1883',
                pass: 'REDACTED',
                user: 'addons'
            },
            logger: '@ha:ps5:*,@ha:ps5-sensitive:*',
            device_check_interval: 5000,
            device_discovery_interval: 60000,
            account_check_interval: 5000,
            include_ps4_devices: false,
            device_discovery_broadcast_address: undefined,
            psn_accounts: [
                {
                    username: 'REDACTED',
                    npsso: 'REDACTED'
                }
            ],
            credentialsStoragePath: '/config/ps5-mqtt/credentials.json',
            frontendPort: '62428'
        });
    });
});