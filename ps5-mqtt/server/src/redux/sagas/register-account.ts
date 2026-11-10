import type MQTT from "async-mqtt"
import { call, getContext } from "redux-saga/effects"

import { MQTT_CLIENT, SETTINGS, Settings } from "../../services"
import { createErrorLogger } from "../../util/error-logger"
import { HaMqtt } from "../../util/ha-mqtt"
import type { RegisterPsnAccountAction } from "../types"

const logError = createErrorLogger()

// Announces the account-level presence entities. They hang off a Home
// Assistant device for the PSN account (not for a console), so they exist
// whether or not any console is reachable or awake.
function* registerAccount({ payload: account }: RegisterPsnAccountAction) {
  try {
    const mqtt: MQTT.AsyncClient = yield getContext(MQTT_CLIENT)
    const {
      discoveryTopic,
      checkAccountInterval,
      checkAccountIdleInterval,
    }: Settings = yield getContext(SETTINGS)

    const stateTopic = HaMqtt.getAccountStateTopic(account.accountId)
    const device = HaMqtt.getMqttAccountDeviceConfig(account)
    const nodeId = `psn_account_${account.accountId}`

    // Safety net for a stuck or dead poller: Home Assistant marks the entity
    // unavailable (never off) if no new state arrives for a few poll periods.
    const expireAfter = Math.max(
      120,
      Math.ceil(
        (3 * Math.max(checkAccountInterval, checkAccountIdleInterval)) / 1000,
      ),
    )

    const common = {
      availability: [
        {
          topic: HaMqtt.getAccountAvailabilityTopic(account.accountId),
          payload_available: "online",
          payload_not_available: "offline",
        },
      ],
      state_topic: stateTopic,
      device,
      enabled_by_default: true,
      expire_after: expireAfter,
    }

    const publish = (topic: string, config: object) =>
      call<
        (
          topic: string,
          message: string | Buffer,
          opts: MQTT.IClientPublishOptions,
        ) => Promise<MQTT.IPublishPacket>
      >(mqtt.publish.bind(mqtt), topic, JSON.stringify(config), {
        qos: 1,
        retain: true,
      })

    // https://www.home-assistant.io/integrations/binary_sensor.mqtt/
    yield publish(`${discoveryTopic}/binary_sensor/${nodeId}/online/config`, <
      HaMqtt.Config.MqttBinarySensorEntity
    >{
      ...common,
      name: `PSN ${account.accountName} online`,
      unique_id: `${nodeId}_online_ps5mqtt`,
      device_class: "connectivity",
      payload_on: "ON",
      payload_off: "OFF",
      value_template: "{{ value_json.online }}",
      icon: "mdi:sony-playstation",
    })

    // https://www.home-assistant.io/integrations/sensor.mqtt/
    yield publish(`${discoveryTopic}/sensor/${nodeId}/last_online/config`, <
      HaMqtt.Config.MqttSensorEntity
    >{
      ...common,
      name: `PSN ${account.accountName} last online`,
      unique_id: `${nodeId}_last_online_ps5mqtt`,
      device_class: "timestamp",
      value_template: "{{ value_json.last_online }}",
    })

    yield publish(`${discoveryTopic}/sensor/${nodeId}/platform/config`, <
      HaMqtt.Config.MqttSensorEntity
    >{
      ...common,
      name: `PSN ${account.accountName} platform`,
      unique_id: `${nodeId}_platform_ps5mqtt`,
      value_template: "{{ value_json.platform }}",
      icon: "mdi:controller",
    })
  } catch (e) {
    // a failed announcement must not take down the other sagas
    logError(e)
  }
}

export { registerAccount }
