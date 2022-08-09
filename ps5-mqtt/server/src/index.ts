
import { configureStore } from "@reduxjs/toolkit";
import MQTT from 'async-mqtt';
import createDebugger from "debug";
import os from 'os';
import path from 'path';
import createSagaMiddleware from "redux-saga";
import { PsnAccount } from "./psn-account";
import reducer, {
    getDeviceRegistry,
    pollDevices,
    pollDiscovery, pollPsnPresence, saga,
    setPowerMode
} from "./redux";
import { SwitchStatus } from "./redux/types";
import { MQTT_CLIENT, Settings, SETTINGS } from "./services";
import { createErrorLogger } from "./util/error-logger";
import { setupWebserver } from "./web-server";

const debug = createDebugger("@ha:ps5");
const debugMqtt = createDebugger("@ha:ps5:mqtt");
const debugState = createDebugger("@ha:state");
const logError = createErrorLogger();

const {
    MQTT_HOST,
    MQTT_PASSWORD,
    MQTT_PORT,
    MQTT_USERNAME,

    FRONTEND_PORT,

    CREDENTIAL_STORAGE_PATH,

    INCLUDE_PS4_DEVICES,

    DEVICE_CHECK_INTERVAL,
    DEVICE_DISCOVERY_INTERVAL,

    PSN_ACCOUNTS,
} = process.env;

const accountsInfo = JSON.parse(PSN_ACCOUNTS);

const credentialStoragePath = CREDENTIAL_STORAGE_PATH
    ? CREDENTIAL_STORAGE_PATH
    : path.join(os.homedir(), '.config', 'playactor', 'credentials.json');

const createMqtt = async (): Promise<MQTT.AsyncMqttClient> => {
    return await MQTT.connectAsync(`mqtt://${MQTT_HOST}`, {
        password: MQTT_PASSWORD,
        port: parseInt(MQTT_PORT || "1883", 10),
        username: MQTT_USERNAME,
        reconnectPeriod: 2000,
        connectTimeout: 3 * 60 * 1000 // 3 minutes
    });
};

async function getPsnAccountRegistry(
    accounts: { npsso: string }[]
): Promise<Record<string, PsnAccount>> {
    const accountRegistry: Record<string, PsnAccount> = {};
    for (const { npsso } of accounts) {
        const account = await PsnAccount.exchangeNpssoForPsnAccount(npsso);
        accountRegistry[account.accountId] = account;
    }
    return accountRegistry;
}

async function run() {
    debug("Started");

    debug("Establishing MQTT Connection...")
    const mqtt: MQTT.AsyncMqttClient = await createMqtt();
    debug("Connected to MQTT Broker!")

    const settings: Settings = {
        checkDevicesInterval:
            parseInt(DEVICE_CHECK_INTERVAL || "5000", 10),
        discoverDevicesInterval:
            parseInt(DEVICE_DISCOVERY_INTERVAL || "60000", 10),
        credentialStoragePath,
        allowPs4Devices: INCLUDE_PS4_DEVICES === 'true',
    };

    try {
        const sagaMiddleware = createSagaMiddleware({
            context: {
                [MQTT_CLIENT]: mqtt,
                [SETTINGS]: settings,
            }
        });
        const store = configureStore({
            reducer,
            middleware: [sagaMiddleware],
            preloadedState: {
                devices: {},
                accounts: await getPsnAccountRegistry(accountsInfo)
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

        store.dispatch(pollPsnPresence());
        store.dispatch(pollDiscovery());
        store.dispatch(pollDevices());
    } catch (e) {
        logError(e);
    }

    setupWebserver(FRONTEND_PORT ?? 3000, settings)
}

if (require.main === module) {
    run();
}

export default run;
