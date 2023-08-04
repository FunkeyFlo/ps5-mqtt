import type MQTT from "async-mqtt";
import { call, getContext, put } from "redux-saga/effects";
import { MQTT_CLIENT } from "../../services";
import { HaMqtt } from "../../util/ha-mqtt";
import { addDevice, updateHomeAssistant } from "../action-creators";
import type { RegisterDeviceAction } from "../types";

function* registerDevice(
    { payload: device }: RegisterDeviceAction
) {
    const mqtt: MQTT.AsyncClient = yield getContext(MQTT_CLIENT);

    const deviceConfig = HaMqtt.getMqttDeviceConfig(device);

    yield call<
        (
            topic: string,
            message: string | Buffer,
            { qos, retain }: MQTT.IClientPublishOptions
        ) => Promise<MQTT.IPublishPacket>
    >(
        mqtt.publish.bind(mqtt),
        `homeassistant/switch/${device.id}/power/config`,
        // https://www.home-assistant.io/integrations/switch.mqtt/
        JSON.stringify(<HaMqtt.Config.MqttSwitchEntity>{
            availability: [
                {
                    topic: `ps5-mqtt/${device.id}`,
                    value_template: "{{ value_json.device_status }}"
                }
            ],
            name: "power",
            command_topic: `ps5-mqtt/${device.id}/set/power`,
            state_topic: `ps5-mqtt/${device.id}`,
            unique_id: `${device.id}_power_ps5mqtt`,
            state_on: "AWAKE",
            state_off: "STANDBY",
            payload_on: "AWAKE",
            payload_off: "STANDBY",
            optimistic: false,
            value_template: "{{ value_json.power }}",
            icon: "mdi:sony-playstation",
            device: deviceConfig
        }),
        { qos: 1, retain: true }
    );

    yield call<
        (
            topic: string,
            message: string | Buffer,
            { qos, retain }: MQTT.IClientPublishOptions
        ) => Promise<MQTT.IPublishPacket>
    >(
        mqtt.publish.bind(mqtt),
        `homeassistant/sensor/${device.id}/activity/config`,
        JSON.stringify(<HaMqtt.Config.MqttSensorEntity>{
            availability: [
                {
                    topic: `ps5-mqtt/${device.id}`,
                    value_template: "{{ value_json.device_status }}"
                }
            ],
            unique_id: `${device.id}_activity_ps5mqtt`,
            state_topic: `ps5-mqtt/${device.id}`,
            name: "activity",
            device: deviceConfig,
            enabled_by_default: true,
            json_attributes_topic: `ps5-mqtt/${device.id}`,
            value_template: "{{ value_json.activity }}"
        }),
        { qos: 1, retain: true }
    )

    yield put(addDevice(device));

    yield put(updateHomeAssistant(device));
}

export { registerDevice };

