import { expectSaga } from "redux-saga-test-plan"
import * as matchers from "redux-saga-test-plan/matchers"

import { MQTT_CLIENT } from "../../../services"
import { psnPresenceUnavailable, updateAccount } from "../../action-creators"
import type { Account } from "../../types"
import { publishAccountPresence } from "../publish-account-presence"

const makeMqtt = (publish = jest.fn().mockResolvedValue({})) => ({ publish })

const run = async (
  action: Parameters<typeof publishAccountPresence>[0],
  mqtt = makeMqtt(),
) => {
  await expectSaga(publishAccountPresence, action)
    .provide([[matchers.getContext(MQTT_CLIENT), mqtt]])
    .run()
  return mqtt.publish
}

const published = (publish: jest.Mock) =>
  Object.fromEntries(
    publish.mock.calls.map(([topic, message]) => [topic, message]),
  )

const makeAccount = (overrides: Partial<Account> = {}): Account => ({
  accountId: "111",
  accountName: "Neal",
  npsso: "x",
  authInfo: {
    accessToken: "",
    accessTokenExpiration: 0,
    refreshToken: "",
    refreshTokenExpiration: 0,
  },
  preferredDevices: {},
  presenceAvailable: true,
  presence: {
    online: true,
    lastOnline: "2024-05-01T10:00:00.000Z",
    platform: "PS5",
    polledAt: 1,
  },
  ...overrides,
})

describe("Publish account presence saga", () => {
  test("publishes an online account with platform and last online, then marks it available", async () => {
    const publish = await run(updateAccount(makeAccount()))

    const messages = published(publish)
    expect(JSON.parse(messages["ps5-mqtt/account/111"])).toEqual({
      online: "ON",
      last_online: "2024-05-01T10:00:00.000Z",
      platform: "PS5",
    })
    expect(messages["ps5-mqtt/account/111/availability"]).toBe("online")
  })

  test("publishes an offline account as OFF while staying available", async () => {
    const publish = await run(
      updateAccount(
        makeAccount({
          presence: {
            online: false,
            lastOnline: "2024-05-01T10:00:00.000Z",
            platform: "PS5",
            polledAt: 1,
          },
        }),
      ),
    )

    const messages = published(publish)
    expect(JSON.parse(messages["ps5-mqtt/account/111"])).toEqual({
      online: "OFF",
      last_online: "2024-05-01T10:00:00.000Z",
      // the last-used platform is not the "current" platform
      platform: null,
    })
    expect(messages["ps5-mqtt/account/111/availability"]).toBe("online")
  })

  test("publishes explicit nulls for absent fields", async () => {
    const publish = await run(
      updateAccount(
        makeAccount({
          presence: {
            online: true,
            lastOnline: null,
            platform: null,
            polledAt: 1,
          },
        }),
      ),
    )

    expect(JSON.parse(published(publish)["ps5-mqtt/account/111"])).toEqual({
      online: "ON",
      last_online: null,
      platform: null,
    })
  })

  test("a failed poll marks the account unavailable and leaves the state alone", async () => {
    const publish = await run(
      updateAccount(makeAccount({ presenceAvailable: false })),
    )

    const messages = published(publish)
    expect(messages["ps5-mqtt/account/111/availability"]).toBe("offline")
    expect(messages).not.toHaveProperty("ps5-mqtt/account/111")
  })

  test("a presence check that threw marks only that account unavailable", async () => {
    const publish = await run(psnPresenceUnavailable("222"))

    expect(published(publish)).toEqual({
      "ps5-mqtt/account/222/availability": "offline",
    })
  })

  test("keeps separate topics per account", async () => {
    const mqtt = makeMqtt()
    await run(updateAccount(makeAccount({ accountId: "111" })), mqtt)
    await run(
      updateAccount(
        makeAccount({
          accountId: "222",
          presence: {
            online: false,
            lastOnline: null,
            platform: null,
            polledAt: 1,
          },
        }),
      ),
      mqtt,
    )

    const messages = published(mqtt.publish)
    expect(JSON.parse(messages["ps5-mqtt/account/111"]).online).toBe("ON")
    expect(JSON.parse(messages["ps5-mqtt/account/222"]).online).toBe("OFF")
  })

  test("survives an MQTT publish failure", async () => {
    const mqtt = makeMqtt(jest.fn().mockRejectedValue(new Error("mqtt down")))

    await expect(run(updateAccount(makeAccount()), mqtt)).resolves.toBeDefined()
  })
})
