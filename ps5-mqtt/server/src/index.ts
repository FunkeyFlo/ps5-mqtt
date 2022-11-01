
import { configureStore } from "@reduxjs/toolkit";
import MQTT from 'async-mqtt';
import createDebugger from "debug";
import os from 'os';
import path from 'path';
import createSagaMiddleware from "redux-saga";

import { AppConfig, getAppConfig } from "./config";
import { PsnAccount } from "./psn-account";
import reducer, {
    getDeviceRegistry,
    pollDevices,
    pollDiscovery, pollPsnPresence, saga,
    setPowerMode
} from "./redux";
import { Account, SwitchStatus } from "./redux/types";
import { MQTT_CLIENT, Settings, SETTINGS } from "./services";
import { createErrorLogger } from "./util/error-logger";
import { setupWebserver } from "./web-server";

const debug = createDebugger("@ha:ps5");
const debugMqtt = createDebugger("@ha:ps5:mqtt");
const debugState = createDebugger("@ha:state");
const logError = createErrorLogger();

const appConfig = getAppConfig();
createDebugger("@ha:ps5-sensitive:parsed-config")(appConfig);

const createMqtt = async (): Promise<MQTT.AsyncMqttClient> => {
    return await MQTT.connectAsync(`mqtt://${appConfig.mqtt.host}`, {
        password: appConfig.mqtt.pass,
        port: parseInt(appConfig.mqtt.port || "1883", 10),
        username: appConfig.mqtt.user,
        reconnectPeriod: 2000,
        connectTimeout: 3 * 60 * 1000 // 3 minutes
    });
};

async function getPsnAccountRegistry(
    accounts: AppConfig.PsnAccountInfo[]
): Promise<Record<string, Account>> {
    const accountRegistry: Record<string, Account> = {};
    for (const accountInfo of accounts) {
        try {
            const account = await PsnAccount.exchangeNpssoForPsnAccount(
                accountInfo.npsso,
                accountInfo.username
            );
            accountRegistry[account.accountId] = {
                ...account,
                preferredDevices: {
                    ps4: accountInfo.preferred_ps4,
                    ps5: accountInfo.preferred_ps5,
                }
            };
        } catch (e) {
            logError(e);
            logError(`Account '${accountInfo.username ?? 'unknown'}' retrieval failed. Activity for this account will not be tracked.`)
        }
    }
    return accountRegistry;
}

async function run() {
    debug("Started");

    debug("Establishing MQTT Connection...")
    const mqtt: MQTT.AsyncMqttClient = await createMqtt();
    debug("Connected to MQTT Broker!")

    const settings: Settings = {
        // polling intervals
        checkDevicesInterval: appConfig.device_check_interval || 5000,
        checkAccountInterval: appConfig.account_check_interval || 5000,
        discoverDevicesInterval: appConfig.device_discovery_interval || 60000,

        credentialStoragePath: appConfig.credentialsStoragePath
            ?? path.join(os.homedir(), '.config', 'playactor', 'credentials.json'),
        allowPs4Devices: appConfig.include_ps4_devices ?? true,

        deviceDiscoveryBroadcastAddress: appConfig.device_discovery_broadcast_address
    };

    try {
        const sagaMiddleware = createSagaMiddleware({
            context: {
                [MQTT_CLIENT]: mqtt,
                [SETTINGS]: settings,
            }
        });
        const accounts = await getPsnAccountRegistry(appConfig.psn_accounts ?? []);
        createDebugger("@ha:ps5-sensitive:registered-accounts")(accounts);
        const store = configureStore({
            reducer,
            middleware: [sagaMiddleware],
            preloadedState: {
                devices: {},
                accounts: accounts,
            }
        });
        store.subscribe(() => {
            debugState(JSON.stringify(store.getState(), null, 2));
        });
        sagaMiddleware.run(saga);

        const cmdTopicRegEx = /^ps5-mqtt\/([^/]*)\/set\/(.*)$/;

        mqtt.on("message", async (topic, payload) => {
            debugMqtt("MQTT Message received", topic);

            if (cmdTopicRegEx.test(topic)) {
                const matches = cmdTopicRegEx.exec(topic);
                if (!matches) {
                    return;
                }
                const [, deviceId, deviceProperty] = matches;
                const devices = getDeviceRegistry(store.getState());
                const device = devices[deviceId];
                if (device !== undefined && deviceProperty === 'power') {
                    const data = payload.toString();
                    store.dispatch(setPowerMode(device, data as SwitchStatus));
                }
            }
        });

        await mqtt.subscribe('ps5-mqtt/#');

        // don't poll if there are no accounts registered
        if (Object.keys(accounts).length > 0) {
            store.dispatch(pollPsnPresence());
        }

        store.dispatch(pollDiscovery());
        store.dispatch(pollDevices());
    } catch (e) {
        logError(e);
    }

    setupWebserver(appConfig.frontendPort ?? 3000, settings)
}

if (require.main === module) {
    run();
}

export default run;
