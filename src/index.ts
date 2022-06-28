import createDebugger from "debug";
import { applyMiddleware, createStore } from "redux";
import createSagaMiddleware from "redux-saga";
import reducer, {
    applyToDevice,
    getDevices,
    pollDevices,
    pollDiscovery,
    saga,
} from "./redux";
import { SwitchStatus } from "./redux/types";
import { createMqtt } from "./util/mqtt-client";

const debug = createDebugger("@ha/ps5");
const debugState = createDebugger("@ha/state");

async function run() {
    debug("Started");
    try {
        const sagaMiddleware = createSagaMiddleware();
        const store = createStore(reducer, applyMiddleware(sagaMiddleware));
        store.subscribe(() => {
            debugState(JSON.stringify(store.getState(), null, 2));
        });
        sagaMiddleware.run(saga);
        const mqtt = await createMqtt();

        const topicRegEx = /^homeassistant\/switch\/(.*)\/set$/;
        mqtt.on("message", (topic, payload) => {
            if (topicRegEx.test(topic)) {
                const matches = topicRegEx.exec(topic);
                if (!matches) {
                    return;
                }
                const homeAssistantId = matches[1];
                const devices = getDevices(store.getState());
                const device = devices.find(
                    (device) => device.homeAssistantId === homeAssistantId
                );
                if (!device) {
                    return;
                }
                const data = payload.toString();
                store.dispatch(applyToDevice(device, data as SwitchStatus));
            }
        });

        store.dispatch(pollDevices());
        store.dispatch(pollDiscovery());
    } catch (e) {
        debug(e);
    }
}

if (require.main === module) {
    run();
}

export default run;
