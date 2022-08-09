import { DeviceType } from "playactor/dist/discovery/model";
import { Playstation } from "../device";

export module HaMqtt {

    export module Config {

        export interface MqttDevice {
            manufacturer?: string;
            model?: string;
            name: string;
            identifiers?: string[];
            connections?: [string, string][];
            sw_version?: string;
        }

        export interface MqttSwitchEntity extends MqttEntity {
            command_topic: string;
            device_class?: string;
            state_on?: string;
            state_off?: string;
            payload_on?: string;
            payload_off?: string;
        }

        export interface MqttSensorEntity extends MqttEntity {
            device_class?: string;
        }

        interface MqttEntity {
            name: string,
            state_topic?: string;
            object_id?: string;
            unique_id?: string;
            icon?: string;
            availability_topic?: string;
            device?: MqttDevice;
            enabled_by_default?: boolean;
            json_attributes_topic?: string;
        }

    }

    export function getMqttDeviceConfig(device: Playstation): Config.MqttDevice {
        return {
            manufacturer: "Sony",
            model: "Playstation " + (device.type === DeviceType.PS5 ? '5' : '4'),
            name: device.name,
            identifiers: [ device.id ],
            connections: [
                ["ip", device.address.address]
            ],
            sw_version: device.systemVersion
        }
    }
}