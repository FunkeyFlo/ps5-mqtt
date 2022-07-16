import type MQTT from "async-mqtt";
import { call, getContext, put } from "redux-saga/effects";
import { MQTT_CLIENT } from "../../services";
import { HaMqtt } from "../../util/ha-mqtt";
import { addDevice, updateHomeAssistant } from "../action-creators";
import type { RegisterDeviceAction } from "../types";

function* registerDevice(
    { payload: ps5 }: RegisterDeviceAction
) {
    const mqtt: MQTT.AsyncClient = yield getContext(MQTT_CLIENT);

    yield call<
        (
            topic: string,
            message: string | Buffer,
            { qos: number, retain: boolean }
        ) => Promise<MQTT.IPublishPacket>
    >(
        mqtt.publish.bind(mqtt),
        `homeassistant/switch/${ps5.id}/power/config`,
        // https://www.home-assistant.io/integrations/switch.mqtt/
        JSON.stringify(<HaMqtt.Config.MqttEntity>{
            availability: [
                {
                    topic: `ps5-mqtt/${ps5.name}`,
                    value_template: "{{ value_json.device_status }}"
                }
            ],
            name: ps5.name + " power",
            command_topic: `ps5-mqtt/${ps5.name}/set/power`,
            state_topic: `ps5-mqtt/${ps5.name}`,
            unique_id: `${ps5.id}_switch_power`,
            state_on: "AWAKE",
            state_off: "STANDBY",
            payload_on: "AWAKE",
            payload_off: "STANDBY",
            optimistic: false,
            value_template: "{{ value_json.power }}",
            icon: "mdi:sony-playstation",
            device: HaMqtt.getMqttDeviceConfig(ps5)
        }),
        { qos: 1, retain: true }
    );

    yield put(addDevice(ps5));

    yield put(updateHomeAssistant(ps5));
}

export { registerDevice };

