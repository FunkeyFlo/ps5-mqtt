import lodash from "lodash"
import { expectSaga } from "redux-saga-test-plan"
import * as matchers from "redux-saga-test-plan/matchers"
import type { PutEffect } from "redux-saga/effects"

import type { PlayactorClient } from "../../../playactor/client"
import { PLAYACTOR_CLIENT } from "../../../services"
import type { ChangePowerModeAction, Device, SwitchStatus } from "../../types"
import { turnOffDevice } from "../turn-off-device"

describe("Turn Off Device saga", () => {
  afterEach(() => {
    jest.clearAllMocks()
  })

  test("does nothing when the requested mode is not STANDBY", async () => {
    const client = makeClient()

    const { effects } = await expectSaga(turnOffDevice, action("AWAKE"))
      .provide([[matchers.getContext(PLAYACTOR_CLIENT), client]])
      .run()

    expect(client.standby).not.toHaveBeenCalled()
    expect(putActions(effects.put)).toHaveLength(0)
  })

  test("puts the device into standby and clears activity on success", async () => {
    const client = makeClient()

    const { effects } = await expectSaga(turnOffDevice, action("STANDBY"))
      .provide([[matchers.getContext(PLAYACTOR_CLIENT), client]])
      .run()

    expect(client.standby).toHaveBeenCalledWith("192.168.0.10")

    const dispatched = putActions(effects.put)
    expect(dispatched.map((a) => a.type)).toEqual([
      "TRANSITIONING",
      "UPDATE_HOME_ASSISTANT",
    ])
    const update = dispatched.find((a) => a.type === "UPDATE_HOME_ASSISTANT")
    expect(update?.payload).toMatchObject({
      status: "STANDBY",
      activity: undefined,
    })
  })

  test("swallows standby failures and does not report a state update", async () => {
    const client = makeClient({
      standby: jest.fn<Promise<void>, [string]>().mockRejectedValue("boom"),
    })

    const { effects } = await expectSaga(turnOffDevice, action("STANDBY"))
      .provide([[matchers.getContext(PLAYACTOR_CLIENT), client]])
      .run()

    expect(putActions(effects.put).map((a) => a.type)).toEqual([
      "TRANSITIONING",
    ])
  })
})

// --- helpers ---

type DispatchedAction = { type: string; payload?: unknown }

const DEFAULT_DEVICE: Device = {
  address: { address: "192.168.0.10", port: 80 },
  available: true,
  id: "mock-id-1",
  name: "mock-ps5-1",
  normalizedName: "mock_ps5_1",
  status: "AWAKE",
  systemVersion: "",
  transitioning: false,
  type: "PS5",
  activity: {
    launchPlatform: "PS5",
    platform: "PS5",
    titleId: "GAME1",
    titleImage: "http://example/game1.png",
    titleName: "Game 1",
    activePlayers: ["TestUser"],
  },
}

function makeDevice(overrides: Partial<Device> = {}): Device {
  return lodash.merge({}, DEFAULT_DEVICE, overrides)
}

function putActions(puts: PutEffect[] | undefined): DispatchedAction[] {
  return (puts ?? []).map((effect) => effect.payload.action as DispatchedAction)
}

function makeClient(over: Partial<PlayactorClient> = {}): PlayactorClient {
  return {
    wake: jest.fn<Promise<void>, [string]>().mockResolvedValue(undefined),
    standby: jest.fn<Promise<void>, [string]>().mockResolvedValue(undefined),
    check: jest.fn(),
    ...over,
  }
}

function action(mode: SwitchStatus): ChangePowerModeAction {
  return {
    type: "CHANGE_POWER_MODE",
    payload: { device: makeDevice(), mode },
  }
}
