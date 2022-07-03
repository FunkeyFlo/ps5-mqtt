import type MQTT from "async-mqtt";
import { call, select } from "redux-saga/effects";
import { createMqtt } from "../../util/mqtt-client";
import type { UpdateHomeAssistantAction } from "../types";

function* updateHomeAssistant(action: UpdateHomeAssistantAction) {
    const mqtt: MQTT.AsyncMqttClient = yield call(createMqtt);
    yield call<
        (
            topic: string,
            message: string | Buffer,
            { qos: number }
        ) => Promise<MQTT.IPublishPacket>
    >(
        mqtt.publish.bind(mqtt),
        `homeassistant/switch/${action.payload.device.homeAssistantId}/state`,
        action.payload.device.status,
        { qos: 1 }
    );
}

export { updateHomeAssistant };
