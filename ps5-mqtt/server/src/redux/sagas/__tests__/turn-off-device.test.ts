import { runSaga } from "redux-saga"

import type { PlayactorClient } from "../../../playactor/client"
import { PLAYACTOR_CLIENT } from "../../../services"
import type { ChangePowerModeAction, Device, SwitchStatus } from "../../types"
import { turnOffDevice } from "../turn-off-device"

const mockDevice: Device = {
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

const makeClient = (over: Partial<PlayactorClient> = {}): PlayactorClient => ({
  wake: jest.fn<Promise<void>, [string]>().mockResolvedValue(undefined),
  standby: jest.fn<Promise<void>, [string]>().mockResolvedValue(undefined),
  check: jest.fn(),
  ...over,
})

const runTurnOff = async (client: PlayactorClient, mode: SwitchStatus) => {
  const dispatched: { type: string; payload?: unknown }[] = []
  await runSaga(
    {
      dispatch: (action: { type: string; payload?: unknown }) =>
        dispatched.push(action),
      getState: () => ({}),
      context: { [PLAYACTOR_CLIENT]: client },
    },
    turnOffDevice,
    <ChangePowerModeAction>{
      type: "CHANGE_POWER_MODE",
      payload: { device: mockDevice, mode },
    },
  ).toPromise()
  return dispatched
}

describe("Turn Off Device saga", () => {
  afterEach(() => {
    jest.clearAllMocks()
  })

  test("does nothing when the requested mode is not STANDBY", async () => {
    const client = makeClient()

    const dispatched = await runTurnOff(client, "AWAKE")

    expect(client.standby).not.toHaveBeenCalled()
    expect(dispatched).toHaveLength(0)
  })

  test("puts the device into standby and clears activity on success", async () => {
    const client = makeClient()

    const dispatched = await runTurnOff(client, "STANDBY")

    expect(client.standby).toHaveBeenCalledWith("192.168.0.10")
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

    const dispatched = await runTurnOff(client, "STANDBY")

    expect(dispatched.map((a) => a.type)).toEqual(["TRANSITIONING"])
  })
})
