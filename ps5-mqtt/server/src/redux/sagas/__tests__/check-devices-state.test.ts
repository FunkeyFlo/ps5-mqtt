import lodash from "lodash"
import { expectSaga } from "redux-saga-test-plan"
import * as matchers from "redux-saga-test-plan/matchers"
import type { PutEffect } from "redux-saga/effects"

import type { PlayactorClient } from "../../../playactor/client"
import { PLAYACTOR_CLIENT } from "../../../services"
import { addDevice, setTransitioning } from "../../action-creators"
import reducer from "../../reducer"
import type { AnyAction, Device, State } from "../../types"
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

  test("resets checkFailures when a device recovers with unchanged status after a transient failure", async () => {
    const device = makeDevice({
      status: "AWAKE",
      available: true,
      checkFailures: 1,
    })
    const client = makeClient({
      check: jest.fn<Promise<Device>, [string]>().mockResolvedValue(device),
    })

    const { effects } = await expectSaga(checkDevicesState)
      .withState(stateWith(device))
      .provide([[matchers.getContext(PLAYACTOR_CLIENT), client]])
      .run()

    const dispatched = putActions(effects.put)
    expect(dispatched.map((a) => a.type)).toEqual(["UPDATE_DEVICE"])
    expect(dispatched[0].payload).toEqual({
      id: "mock-id-1",
      checkFailures: 0,
    })
  })

  test("resets checkFailures when a transitioning device is checked successfully", async () => {
    const device = makeDevice({
      status: "AWAKE",
      available: true,
      transitioning: true,
      checkFailures: 1,
    })
    const client = makeClient({
      check: jest.fn<Promise<Device>, [string]>().mockResolvedValue(device),
    })

    const { effects } = await expectSaga(checkDevicesState)
      .withState(stateWith(device))
      .provide([[matchers.getContext(PLAYACTOR_CLIENT), client]])
      .run()

    const dispatched = putActions(effects.put)
    expect(dispatched.map((a) => a.type)).toEqual(["UPDATE_DEVICE"])
    expect(dispatched[0].payload).toEqual({
      id: "mock-id-1",
      checkFailures: 0,
    })
  })

  test("updates HA when the device status changes", async () => {
    const device = makeDevice({ status: "STANDBY", checkFailures: 1 })
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
      checkFailures: 0,
    })
  })

  test("skips a transitioning device without dispatching when check succeeds and checkFailures is 0", async () => {
    const device = makeDevice({ transitioning: true, checkFailures: 0 })
    const client = makeClient()

    const { effects } = await expectSaga(checkDevicesState)
      .withState(stateWith(device))
      .provide([[matchers.getContext(PLAYACTOR_CLIENT), client]])
      .run()

    expect(putActions(effects.put)).toHaveLength(0)
  })

  test("skips a transitioning device when check fails without marking it unavailable", async () => {
    const device = makeDevice({ transitioning: true })
    const client = makeClient({
      check: jest
        .fn<Promise<Device>, [string]>()
        .mockRejectedValue(new Error("unreachable")),
    })

    const { effects } = await expectSaga(checkDevicesState)
      .withState(stateWith(device))
      .provide([[matchers.getContext(PLAYACTOR_CLIENT), client]])
      .run()

    expect(putActions(effects.put)).toHaveLength(0)
  })

  test("debounces the first check failure on an available device without marking HA unavailable", async () => {
    const device = makeDevice({ available: true })
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
    expect(dispatched.map((a) => a.type)).toEqual(["UPDATE_DEVICE"])
    expect(dispatched[0].payload).toEqual({
      id: "mock-id-1",
      checkFailures: 1,
    })
  })

  test("marks the device unavailable when consecutive checks fail", async () => {
    const device = makeDevice({ available: true, checkFailures: 1 })
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
      checkFailures: 2,
    })
  })

  test("does not re-dispatch UPDATE_HOME_ASSISTANT when the device is already unavailable", async () => {
    const device = makeDevice({
      status: "UNKNOWN",
      available: false,
      checkFailures: 2,
    })
    const client = makeClient({
      check: jest
        .fn<Promise<Device>, [string]>()
        .mockRejectedValue(new Error("unreachable")),
    })

    const { effects } = await expectSaga(checkDevicesState)
      .withState(stateWith(device))
      .provide([[matchers.getContext(PLAYACTOR_CLIENT), client]])
      .run()

    expect(putActions(effects.put)).toHaveLength(0)
  })
})

describe("Check Devices State multi-poll integration with reducer", () => {
  afterEach(() => {
    jest.clearAllMocks()
  })

  test("poll sequence FAIL -> AWAKE -> AWAKE on an AWAKE device publishes zero offline flaps", async () => {
    let state = reducer(
      undefined,
      addDevice(makeDevice({ status: "AWAKE", available: true })),
    )

    const failClient = makeClient({
      check: jest
        .fn<Promise<Device>, [string]>()
        .mockRejectedValue(new Error("temporary network timeout")),
    })
    const awakeClient = makeClient({
      check: jest
        .fn<Promise<Device>, [string]>()
        .mockResolvedValue(makeDevice({ status: "AWAKE" })),
    })

    const runPoll = async (client: PlayactorClient) => {
      const { effects } = await expectSaga(checkDevicesState)
        .withState(state)
        .provide([[matchers.getContext(PLAYACTOR_CLIENT), client]])
        .run()
      const actions = putActions(effects.put)
      for (const action of actions) {
        state = reducer(state, action as AnyAction)
      }
      return actions
    }

    // Poll 1: FAIL -> debounced, checkFailures: 1 in state, HA not notified
    const poll1Actions = await runPoll(failClient)
    expect(poll1Actions.map((a) => a.type)).toEqual(["UPDATE_DEVICE"])
    expect(state.devices["mock-id-1"].checkFailures).toBe(1)
    expect(state.devices["mock-id-1"].available).toBe(true)
    expect(state.devices["mock-id-1"].status).toBe("AWAKE")

    // Poll 2: AWAKE -> recovers, checkFailures reset to 0, status unchanged so zero HA updates
    const poll2Actions = await runPoll(awakeClient)
    expect(poll2Actions.map((a) => a.type)).toEqual(["UPDATE_DEVICE"])
    expect(poll2Actions[0].payload).toEqual({
      id: "mock-id-1",
      checkFailures: 0,
    })
    expect(state.devices["mock-id-1"].checkFailures).toBe(0)
    expect(state.devices["mock-id-1"].available).toBe(true)
    expect(state.devices["mock-id-1"].status).toBe("AWAKE")

    // Poll 3: AWAKE -> steady state, no actions dispatched
    const poll3Actions = await runPoll(awakeClient)
    expect(poll3Actions).toHaveLength(0)
    expect(state.devices["mock-id-1"].checkFailures).toBe(0)
    expect(state.devices["mock-id-1"].available).toBe(true)
    expect(state.devices["mock-id-1"].status).toBe("AWAKE")
  })

  test("poll sequence FAIL -> FAIL -> FAIL publishes UNKNOWN/offline on second FAIL and deduplicates third FAIL", async () => {
    let state = reducer(
      undefined,
      addDevice(makeDevice({ status: "AWAKE", available: true })),
    )

    const failClient = makeClient({
      check: jest
        .fn<Promise<Device>, [string]>()
        .mockRejectedValue(new Error("offline")),
    })

    const runPoll = async (client: PlayactorClient) => {
      const { effects } = await expectSaga(checkDevicesState)
        .withState(state)
        .provide([[matchers.getContext(PLAYACTOR_CLIENT), client]])
        .run()
      const actions = putActions(effects.put)
      for (const action of actions) {
        state = reducer(state, action as AnyAction)
      }
      return actions
    }

    // Poll 1: First FAIL -> debounced, checkFailures: 1
    const poll1Actions = await runPoll(failClient)
    expect(poll1Actions.map((a) => a.type)).toEqual(["UPDATE_DEVICE"])
    expect(state.devices["mock-id-1"].checkFailures).toBe(1)
    expect(state.devices["mock-id-1"].available).toBe(true)
    expect(state.devices["mock-id-1"].status).toBe("AWAKE")

    // Poll 2: Second FAIL -> consecutive failures exceed threshold, publish UNKNOWN / unavailable
    const poll2Actions = await runPoll(failClient)
    expect(poll2Actions.map((a) => a.type)).toEqual(["UPDATE_HOME_ASSISTANT"])
    expect(poll2Actions[0].payload).toMatchObject({
      status: "UNKNOWN",
      available: false,
      checkFailures: 2,
    })
    expect(state.devices["mock-id-1"].status).toBe("UNKNOWN")
    expect(state.devices["mock-id-1"].available).toBe(false)
    expect(state.devices["mock-id-1"].checkFailures).toBe(2)

    // Poll 3: Third FAIL -> already unavailable, no duplicate MQTT/HA dispatch
    const poll3Actions = await runPoll(failClient)
    expect(poll3Actions).toHaveLength(0)
    expect(state.devices["mock-id-1"].status).toBe("UNKNOWN")
    expect(state.devices["mock-id-1"].available).toBe(false)
  })

  test("a device sitting at checkFailures: 1 that goes through a transition gets checkFailures reset and a fresh debounce on next failure", async () => {
    let state = reducer(
      undefined,
      addDevice(makeDevice({ status: "AWAKE", available: true })),
    )

    const failClient = makeClient({
      check: jest
        .fn<Promise<Device>, [string]>()
        .mockRejectedValue(new Error("offline")),
    })

    const runPoll = async (client: PlayactorClient) => {
      const { effects } = await expectSaga(checkDevicesState)
        .withState(state)
        .provide([[matchers.getContext(PLAYACTOR_CLIENT), client]])
        .run()
      const actions = putActions(effects.put)
      for (const action of actions) {
        state = reducer(state, action as AnyAction)
      }
      return actions
    }

    // Poll 1: FAIL -> debounced, sits at checkFailures: 1
    const poll1Actions = await runPoll(failClient)
    expect(poll1Actions.map((a) => a.type)).toEqual(["UPDATE_DEVICE"])
    expect(state.devices["mock-id-1"].checkFailures).toBe(1)

    // User triggers power transition -> setTransitioning({ id, transitioning: true })
    state = reducer(
      state,
      setTransitioning({ id: "mock-id-1", transitioning: true }),
    )
    expect(state.devices["mock-id-1"].transitioning).toBe(true)
    expect(state.devices["mock-id-1"].checkFailures).toBe(0)

    // Transition completes -> setTransitioning({ id, transitioning: false })
    state = reducer(
      state,
      setTransitioning({ id: "mock-id-1", transitioning: false }),
    )
    expect(state.devices["mock-id-1"].transitioning).toBe(false)
    expect(state.devices["mock-id-1"].checkFailures).toBe(0)

    // Next failure gets a fresh debounce (checkFailures: 1) instead of marking unavailable immediately
    const pollAfterTransition = await runPoll(failClient)
    expect(pollAfterTransition.map((a) => a.type)).toEqual(["UPDATE_DEVICE"])
    expect(pollAfterTransition[0].payload).toEqual({
      id: "mock-id-1",
      checkFailures: 1,
    })
    expect(state.devices["mock-id-1"].checkFailures).toBe(1)
    expect(state.devices["mock-id-1"].available).toBe(true)
    expect(state.devices["mock-id-1"].status).toBe("AWAKE")
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
