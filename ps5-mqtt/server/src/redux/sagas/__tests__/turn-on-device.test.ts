import { runSaga } from "redux-saga"

import type { PlayactorClient } from "../../../playactor/client"
import { PLAYACTOR_CLIENT } from "../../../services"
import type { ChangePowerModeAction, Device, SwitchStatus } from "../../types"
import { turnOnDevice } from "../turn-on-device"

const mockDevice: Device = {
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

const makeClient = (over: Partial<PlayactorClient> = {}): PlayactorClient => ({
  wake: jest.fn<Promise<void>, [string]>().mockResolvedValue(undefined),
  standby: jest.fn<Promise<void>, [string]>().mockResolvedValue(undefined),
  check: jest.fn(),
  ...over,
})

const runTurnOn = async (client: PlayactorClient, mode: SwitchStatus) => {
  const dispatched: { type: string; payload?: unknown }[] = []
  await runSaga(
    {
      dispatch: (action: { type: string; payload?: unknown }) =>
        dispatched.push(action),
      getState: () => ({}),
      context: { [PLAYACTOR_CLIENT]: client },
    },
    turnOnDevice,
    <ChangePowerModeAction>{
      type: "CHANGE_POWER_MODE",
      payload: { device: mockDevice, mode },
    },
  ).toPromise()
  return dispatched
}

describe("Turn On Device saga", () => {
  afterEach(() => {
    jest.clearAllMocks()
  })

  test("does nothing when the requested mode is not AWAKE", async () => {
    const client = makeClient()

    const dispatched = await runTurnOn(client, "STANDBY")

    expect(client.wake).not.toHaveBeenCalled()
    expect(dispatched).toHaveLength(0)
  })

  test("wakes the device and reports AWAKE to Home Assistant on success", async () => {
    const client = makeClient()

    const dispatched = await runTurnOn(client, "AWAKE")

    expect(client.wake).toHaveBeenCalledWith("192.168.0.10")
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

    const dispatched = await runTurnOn(client, "AWAKE")

    expect(dispatched.map((a) => a.type)).toEqual(["TRANSITIONING"])
  })
})
