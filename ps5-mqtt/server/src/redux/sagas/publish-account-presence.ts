import type MQTT from "async-mqtt"
import { call, getContext } from "redux-saga/effects"

import { MQTT_CLIENT } from "../../services"
import { createErrorLogger } from "../../util/error-logger"
import { HaMqtt } from "../../util/ha-mqtt"
import type {
  PsnPresenceUnavailableAction,
  UpdateAccountAction,
} from "../types"

const logError = createErrorLogger()

type Publish = (
  topic: string,
  message: string | Buffer,
  opts: MQTT.IClientPublishOptions,
) => Promise<MQTT.IPublishPacket>

// Publishes account-level PSN presence. Every publish is driven by a presence
// poll result (UPDATE_PSN_ACCOUNT) or a failed poll (PSN_PRESENCE_UNAVAILABLE),
// never by console state.
//
// Availability is its own topic: a failed poll flips only availability to
// "offline", leaving the last known state untouched, so a PSN or token problem
// reads as "unavailable" in Home Assistant and never as the account being off.
function* publishAccountPresence(
  action: UpdateAccountAction | PsnPresenceUnavailableAction,
) {
  try {
    const mqtt: MQTT.AsyncClient = yield getContext(MQTT_CLIENT)
    const publish = mqtt.publish.bind(mqtt)

    if (action.type === "PSN_PRESENCE_UNAVAILABLE") {
      yield call<Publish>(
        publish,
        HaMqtt.getAccountAvailabilityTopic(action.payload.accountId),
        "offline",
        { qos: 1, retain: true },
      )
      return
    }

    const account = action.payload
    const { presence } = account

    if (account.presenceAvailable !== true || presence === undefined) {
      yield call<Publish>(
        publish,
        HaMqtt.getAccountAvailabilityTopic(account.accountId),
        "offline",
        { qos: 1, retain: true },
      )
      return
    }

    yield call<Publish>(
      publish,
      HaMqtt.getAccountStateTopic(account.accountId),
      JSON.stringify({
        online: presence.online ? "ON" : "OFF",
        last_online: presence.lastOnline,
        // PSN keeps reporting the last-used platform after sign-out, which
        // would misread as the "current" platform
        platform: presence.online ? presence.platform : null,
      }),
      { qos: 1, retain: true },
    )

    yield call<Publish>(
      publish,
      HaMqtt.getAccountAvailabilityTopic(account.accountId),
      "online",
      { qos: 1, retain: true },
    )
  } catch (e) {
    logError(e)
  }
}

export { publishAccountPresence }
