import {
    AsyncMqttClient,
    connectAsync,
    IPublishPacket,
    ISubscriptionGrant,
} from "async-mqtt";

const { MQTT_HOST, MQTT_PASSWORD, MQTT_PORT, MQTT_USERNAME } = process.env;
const mqttPort = parseInt(MQTT_PORT || "1883", 10);

let mqttClient: AsyncMqttClient;

const createMqtt = async (
    host: string | undefined = MQTT_HOST,
    port: number | undefined = mqttPort,
    username: string | undefined = MQTT_USERNAME,
    password: string | undefined = MQTT_PASSWORD
): Promise<AsyncMqttClient> => {
    if (!mqttClient) {
        mqttClient = await connectAsync(`mqtt://${host}`, {
            password,
            port,
            username,
        });
    }

    return mqttClient;
};

export { createMqtt };
export type { AsyncMqttClient, IPublishPacket, ISubscriptionGrant };
