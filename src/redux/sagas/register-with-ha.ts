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
        JSON.stringify({
            name: action.payload.name,
            command_topic: `homeassistant/switch/${action.payload.homeAssistantId}/set`,
            state_topic: `homeassistant/switch/${action.payload.homeAssistantId}/state`,
            device_class: "switch",
            unique_id: action.payload.homeAssistantId,
        }),
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

