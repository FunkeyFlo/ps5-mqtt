import type MQTT from "async-mqtt";
import { call, getContext } from "redux-saga/effects";
import { MQTT_CLIENT } from "../../services";
import type { UpdateHomeAssistantAction } from "../types";

function* updateHomeAssistant({ payload: { device: ps5 } }: UpdateHomeAssistantAction) {
    const mqtt: MQTT.AsyncClient = yield getContext(MQTT_CLIENT);

    yield call<
        (
            topic: string,
            message: string | Buffer,
            opts: MQTT.IClientPublishOptions
        ) => Promise<MQTT.IPublishPacket>
    >(
        mqtt.publish.bind(mqtt),
        `ps5-mqtt/${ps5.id}`,
        JSON.stringify({
            power: ps5.status,
            device_status: ps5.available ? 'online' : 'offline'
        }),
        { qos: 1, retain: true }
    );
}

export { updateHomeAssistant };

