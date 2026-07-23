import lodash from "lodash"
import { expectSaga } from "redux-saga-test-plan"
import * as matchers from "redux-saga-test-plan/matchers"
import type { PutEffect } from "redux-saga/effects"

import type { PlayactorClient } from "../../../playactor/client"
import { PLAYACTOR_CLIENT } from "../../../services"
import type { Device, State } from "../../types"
import { checkDevicesState } from "../check-devices-state"

describe("Check Devices State saga", () => {
  afterEach(() => {
    jest.clearAllMocks()
  })

  test("does not update HA when status is unchanged and device is available", async () => {
    const device = makeDevice({ status: "AWAKE", available: true })
    const client = makeClient({
      check: jest.fn<Promise<Device>, [string]>().mockResolvedValue(device),
    })

    const { effects } = await expectSaga(checkDevicesState)
      .withState(stateWith(device))
      .provide([[matchers.getContext(PLAYACTOR_CLIENT), client]])
      .run()

    expect(client.check).toHaveBeenCalledWith("192.168.0.10")
    expect(putActions(effects.put)).toHaveLength(0)
  })

  test("updates HA when the device status changes", async () => {
    const device = makeDevice({ status: "STANDBY" })
    const client = makeClient({
      check: jest
        .fn<Promise<Device>, [string]>()
        .mockResolvedValue(makeDevice({ status: "AWAKE" })),
    })

    const { effects } = await expectSaga(checkDevicesState)
      .withState(stateWith(device))
      .provide([[matchers.getContext(PLAYACTOR_CLIENT), client]])
      .run()

    const dispatched = putActions(effects.put)
    expect(dispatched.map((a) => a.type)).toEqual(["UPDATE_HOME_ASSISTANT"])
    expect(dispatched[0].payload).toMatchObject({
      status: "AWAKE",
      available: true,
    })
  })

  test("skips a transitioning device without dispatching", async () => {
    const device = makeDevice({ transitioning: true })
    const client = makeClient()

    const { effects } = await expectSaga(checkDevicesState)
      .withState(stateWith(device))
      .provide([[matchers.getContext(PLAYACTOR_CLIENT), client]])
      .run()

    expect(putActions(effects.put)).toHaveLength(0)
  })

  test("marks the device unavailable when the check fails", async () => {
    const device = makeDevice()
    const client = makeClient({
      check: jest
        .fn<Promise<Device>, [string]>()
        .mockRejectedValue(new Error("unreachable")),
    })

    const { effects } = await expectSaga(checkDevicesState)
      .withState(stateWith(device))
      .provide([[matchers.getContext(PLAYACTOR_CLIENT), client]])
      .run()

    const dispatched = putActions(effects.put)
    expect(dispatched.map((a) => a.type)).toEqual(["UPDATE_HOME_ASSISTANT"])
    expect(dispatched[0].payload).toMatchObject({
      status: "UNKNOWN",
      available: false,
      activity: undefined,
    })
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
    wake: jest.fn(),
    standby: jest.fn(),
    check: jest.fn<Promise<Device>, [string]>().mockResolvedValue(makeDevice()),
    ...over,
  }
}

function stateWith(device: Device): State {
  return <State>{ devices: { [device.id]: device }, accounts: {} }
}
