import { expectSaga } from "redux-saga-test-plan"
import * as matchers from "redux-saga-test-plan/matchers"

import { MQTT_CLIENT, Settings, SETTINGS } from "../../../services"
import { registerPsnAccount } from "../../action-creators"
import { HaMqtt } from "../../../util/ha-mqtt"
import type { Account } from "../../types"
import { registerAccount } from "../register-account"

const settings = {
  discoveryTopic: "homeassistant",
  checkAccountInterval: 5000,
  checkAccountIdleInterval: 60000,
} as Settings

const makeAccount = (accountId: string, accountName: string): Account => ({
  accountId,
  accountName,
  npsso: "x",
  authInfo: {
    accessToken: "",
    accessTokenExpiration: 0,
    refreshToken: "",
    refreshTokenExpiration: 0,
  },
  preferredDevices: {},
})

const register = async (
  account: Account,
  publish = jest.fn().mockResolvedValue({}),
) => {
  await expectSaga(registerAccount, registerPsnAccount(account))
    .provide([
      [matchers.getContext(MQTT_CLIENT), { publish }],
      [matchers.getContext(SETTINGS), settings],
    ])
    .run()

  const entries: [
    string,
    { config: HaMqtt.Config.MqttSensorEntity; opts: unknown },
  ][] = publish.mock.calls.map(([topic, message, opts]) => [
    topic,
    { config: JSON.parse(message), opts },
  ])
  return Object.fromEntries(entries)
}

describe("Register account saga", () => {
  test("announces online, last online and platform entities for the account", async () => {
    const topics = await register(makeAccount("111", "Neal"))

    expect(Object.keys(topics).sort()).toEqual([
      "homeassistant/binary_sensor/psn_account_111/online/config",
      "homeassistant/sensor/psn_account_111/last_online/config",
      "homeassistant/sensor/psn_account_111/platform/config",
    ])

    const online =
      topics["homeassistant/binary_sensor/psn_account_111/online/config"]
    expect(online.config).toMatchObject({
      name: "PSN Neal online",
      unique_id: "psn_account_111_online_ps5mqtt",
      state_topic: "ps5-mqtt/account/111",
      payload_on: "ON",
      payload_off: "OFF",
      availability: [
        {
          topic: "ps5-mqtt/account/111/availability",
          payload_available: "online",
          payload_not_available: "offline",
        },
      ],
    })
    expect(online.opts).toEqual({ qos: 1, retain: true })

    expect(
      topics["homeassistant/sensor/psn_account_111/last_online/config"].config,
    ).toMatchObject({
      name: "PSN Neal last online",
      unique_id: "psn_account_111_last_online_ps5mqtt",
      device_class: "timestamp",
    })
    expect(
      topics["homeassistant/sensor/psn_account_111/platform/config"].config,
    ).toMatchObject({
      name: "PSN Neal platform",
      unique_id: "psn_account_111_platform_ps5mqtt",
    })
  })

  test("is independent of consoles: attaches to an account device, not a console", async () => {
    const topics = await register(makeAccount("111", "Neal"))

    for (const { config } of Object.values(topics)) {
      expect(config.device.identifiers).toEqual(["psn_account_111"])
    }
  })

  test("gives each account unique ids and topics", async () => {
    const first = await register(makeAccount("111", "Neal"))
    const second = await register(makeAccount("222", "Sam"))

    const ids = [...Object.values(first), ...Object.values(second)].map(
      ({ config }) => config.unique_id,
    )
    expect(new Set(ids).size).toBe(6)
    expect(
      Object.keys(second).every((t) => t.includes("psn_account_222")),
    ).toBe(true)
  })

  test("expires stale state so a dead poller reads as unavailable", async () => {
    const topics = await register(makeAccount("111", "Neal"))

    for (const { config } of Object.values(topics)) {
      expect(config.expire_after).toBe(180)
    }
  })
})
