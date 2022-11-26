import * as fs from 'fs';
import * as process from 'process';
import lodash from 'lodash';
import createDebugger from "debug";

import { createErrorLogger } from './util/error-logger';

const logError = createErrorLogger();
const logSensitive = createDebugger("@ha:ps5-sensitive:raw-config")

export interface AppConfig {
    // yml options
    mqtt: AppConfig.MqttConfig,

    device_check_interval: number,
    device_discovery_interval: number,

    include_ps4_devices: boolean,
    device_discovery_broadcast_address: string,

    psn_accounts: AppConfig.PsnAccountInfo[],

    account_check_interval: number,

    // non yml options
    credentialsStoragePath: string,
    frontendPort: string,
}

export module AppConfig {
    export interface PsnAccountInfo {
        npsso: string;
        username?: string;
        preferred_ps5?: string;
        preferred_ps4?: string;
    }

    export interface MqttConfig {
        host: string;
        pass: string;
        port: string;
        user: string;
    }

    export interface MqttConfig {
        host: string;
        pass: string;
        port: string;
        user: string;
    }
}

export function getAppConfig(): AppConfig {
    const {
        CONFIG_PATH
    } = process.env;

    const configFileOptions = getJsonConfig(CONFIG_PATH);
    const envOptions = getEnvConfig();

    return lodash.merge(configFileOptions, envOptions) as AppConfig
}

function getJsonConfig(configPath: string | undefined): Partial<AppConfig> {
    if (configPath === undefined || !fs.existsSync(configPath)) {
        logError(`config could not be read from '${configPath}'`);
        return {};
    }
    const optionsRaw = fs.readFileSync(configPath, { encoding: 'utf-8' });
    logSensitive(optionsRaw);
    try {
        const options: AppConfig = JSON.parse(optionsRaw);
        return options;
    } catch (err) {
        logError(`Received invalid options: "${optionsRaw}".`)
        return {};
    }
}

function getEnvConfig(): Partial<AppConfig> {
    const {
        MQTT_HOST,
        MQTT_PASSWORD,
        MQTT_PORT,
        MQTT_USERNAME,

        FRONTEND_PORT,

        CREDENTIAL_STORAGE_PATH,

        INCLUDE_PS4_DEVICES,

        DEVICE_DISCOVERY_BROADCAST_ADDRESS,

        DEVICE_CHECK_INTERVAL,
        DEVICE_DISCOVERY_INTERVAL,
        ACCOUNT_CHECK_INTERVAL,

        PSN_ACCOUNTS,
    } = process.env;

    return {
        mqtt: {
            host: MQTT_HOST,
            port: MQTT_PORT,
            pass: MQTT_PASSWORD,
            user: MQTT_USERNAME,
        },

        device_check_interval:
            DEVICE_CHECK_INTERVAL
                ? parseInt(DEVICE_CHECK_INTERVAL, 10)
                : undefined,
        device_discovery_interval:
            DEVICE_DISCOVERY_INTERVAL
                ? parseInt(DEVICE_DISCOVERY_INTERVAL, 10)
                : undefined,
        account_check_interval:
            ACCOUNT_CHECK_INTERVAL
                ? parseInt(ACCOUNT_CHECK_INTERVAL, 10)
                : undefined,

        psn_accounts: PSN_ACCOUNTS ? JSON.parse(PSN_ACCOUNTS) : undefined,
        include_ps4_devices: Boolean(INCLUDE_PS4_DEVICES) ? JSON.parse(INCLUDE_PS4_DEVICES) : undefined,

        device_discovery_broadcast_address: DEVICE_DISCOVERY_BROADCAST_ADDRESS,

        credentialsStoragePath: CREDENTIAL_STORAGE_PATH,
        frontendPort: FRONTEND_PORT
    } as Partial<AppConfig & {
        mqtt: Partial<AppConfig.MqttConfig>
    }>
}