import lodash from "lodash"
import { expectSaga } from "redux-saga-test-plan"
import * as matchers from "redux-saga-test-plan/matchers"
import type { PutEffect } from "redux-saga/effects"

import type { PlayactorClient } from "../../../playactor/client"
import { PLAYACTOR_CLIENT } from "../../../services"
import type { ChangePowerModeAction, Device, SwitchStatus } from "../../types"
import { turnOnDevice } from "../turn-on-device"

describe("Turn On Device saga", () => {
  afterEach(() => {
    jest.clearAllMocks()
  })

  test("does nothing when the requested mode is not AWAKE", async () => {
    const client = makeClient()

    const { effects } = await expectSaga(turnOnDevice, action("STANDBY"))
      .provide([[matchers.getContext(PLAYACTOR_CLIENT), client]])
      .run()

    expect(client.wake).not.toHaveBeenCalled()
    expect(putActions(effects.put)).toHaveLength(0)
  })

  test("wakes the device and reports AWAKE to Home Assistant on success", async () => {
    const client = makeClient()

    const { effects } = await expectSaga(turnOnDevice, action("AWAKE"))
      .provide([[matchers.getContext(PLAYACTOR_CLIENT), client]])
      .run()

    expect(client.wake).toHaveBeenCalledWith("192.168.0.10")

    const dispatched = putActions(effects.put)
    expect(dispatched.map((a) => a.type)).toEqual([
      "TRANSITIONING",
      "UPDATE_HOME_ASSISTANT",
    ])
    const update = dispatched.find((a) => a.type === "UPDATE_HOME_ASSISTANT")
    expect(update?.payload).toMatchObject({ status: "AWAKE" })
  })

  test("swallows wake failures and does not report a state update", async () => {
    const client = makeClient({
      wake: jest.fn<Promise<void>, [string]>().mockRejectedValue("boom"),
    })

    const { effects } = await expectSaga(turnOnDevice, action("AWAKE"))
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
  status: "STANDBY",
  systemVersion: "",
  transitioning: false,
  type: "PS5",
  activity: undefined,
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
