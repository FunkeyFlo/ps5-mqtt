import type MQTT from "async-mqtt";
import { call, put, select } from "redux-saga/effects";
import { createMqtt } from "../../util/mqtt-client";
import { addDevice, updateHomeAssistant } from "../action-creators";
import { getDevices } from "../selectors";
import type { RegisterDeviceWithHomeAssistantAction } from "../types";

function* registerWithHomeAssistant(
    action: RegisterDeviceWithHomeAssistantAction
) {
    const mqtt: MQTT.AsyncMqttClient = yield call(createMqtt);
    yield call<
        (
            topic: string,
            message: string | Buffer,
            { qos: number }
        ) => Promise<MQTT.IPublishPacket>
    >(
        mqtt.publish.bind(mqtt),
        `homeassistant/switch/${action.payload.homeAssistantId}/config`,
        // https://www.home-assistant.io/integrations/switch.mqtt/
        JSON.stringify({
            name: "Power",
            command_topic: `homeassistant/switch/${action.payload.homeAssistantId}/set`,
            state_topic: `homeassistant/switch/${action.payload.homeAssistantId}/state`,
            availability_topic: `homeassistant/switch/${action.payload.homeAssistantId}/availability`,
            device_class: "switch",
            unique_id: action.payload.id + "_power",
            state_on: "AWAKE",
            state_off: "STANDBY",
            payload_on: "AWAKE",
            payload_off: "STANDBY",
            icon: "mdi:sony-playstation",
            device: {
                manufacturer: "Sony",
                model: "Playstation 5",
                name: action.payload.name,
                identifiers: [action.payload.id],
                connections: [
                    ["ip", action.payload.address.address]
                ],
                sw_version: action.payload.systemVersion
            }
        }),
        { qos: 1 }
    );

    yield call<
        (
            topic: string,
            message: string | Buffer,
            { qos: number }
        ) => Promise<MQTT.IPublishPacket>
    >(
        mqtt.publish.bind(mqtt),
        `homeassistant/switch/${action.payload.homeAssistantId}/availability`,
        "online",
        { qos: 1 }
    );

    const devices = yield select(getDevices);
    if (!!devices[action.payload.id]) {
        return;
    }

    yield put(addDevice(action.payload));
    yield put(updateHomeAssistant(action.payload));
    yield call<(topic: string) => Promise<MQTT.ISubscriptionGrant[]>>(
        mqtt.subscribe.bind(mqtt),
        `homeassistant/switch/${action.payload.homeAssistantId}/set`
    );
}

export { registerWithHomeAssistant };

