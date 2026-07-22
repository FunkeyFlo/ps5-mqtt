import { runSaga } from "redux-saga"

import type { PlayactorClient } from "../../../playactor/client"
import { PLAYACTOR_CLIENT } from "../../../services"
import type { Device, State } from "../../types"
import { checkDevicesState } from "../check-devices-state"

const baseDevice: Device = {
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

const makeClient = (over: Partial<PlayactorClient> = {}): PlayactorClient => ({
  wake: jest.fn(),
  standby: jest.fn(),
  check: jest.fn<Promise<Device>, [string]>().mockResolvedValue(baseDevice),
  ...over,
})

const runCheck = async (client: PlayactorClient, device: Device) => {
  const dispatched: { type: string; payload?: unknown }[] = []
  await runSaga(
    {
      dispatch: (action: { type: string; payload?: unknown }) =>
        dispatched.push(action),
      getState: () =>
        <Partial<State>>{
          devices: { [device.id]: device },
        },
      context: { [PLAYACTOR_CLIENT]: client },
    },
    checkDevicesState,
  ).toPromise()
  return dispatched
}

describe("Check Devices State saga", () => {
  afterEach(() => {
    jest.clearAllMocks()
  })

  test("does not update HA when status is unchanged and device is available", async () => {
    const device = { ...baseDevice, status: "AWAKE" as const, available: true }
    const client = makeClient({
      check: jest
        .fn<Promise<Device>, [string]>()
        .mockResolvedValue({ ...device, activity: undefined }),
    })

    const dispatched = await runCheck(client, device)

    expect(client.check).toHaveBeenCalledWith("192.168.0.10")
    expect(dispatched).toHaveLength(0)
  })

  test("updates HA when the device status changes", async () => {
    const device = { ...baseDevice, status: "STANDBY" as const }
    const client = makeClient({
      check: jest
        .fn<Promise<Device>, [string]>()
        .mockResolvedValue({ ...device, status: "AWAKE", activity: undefined }),
    })

    const dispatched = await runCheck(client, device)

    expect(dispatched.map((a) => a.type)).toEqual(["UPDATE_HOME_ASSISTANT"])
    expect(dispatched[0].payload).toMatchObject({
      status: "AWAKE",
      available: true,
    })
  })

  test("skips a transitioning device without dispatching", async () => {
    const device = { ...baseDevice, transitioning: true }
    const client = makeClient()

    const dispatched = await runCheck(client, device)

    expect(dispatched).toHaveLength(0)
  })

  test("marks the device unavailable when the check fails", async () => {
    const device = { ...baseDevice }
    const client = makeClient({
      check: jest
        .fn<Promise<Device>, [string]>()
        .mockRejectedValue(new Error("unreachable")),
    })

    const dispatched = await runCheck(client, device)

    expect(dispatched.map((a) => a.type)).toEqual(["UPDATE_HOME_ASSISTANT"])
    expect(dispatched[0].payload).toMatchObject({
      status: "UNKNOWN",
      available: false,
      activity: undefined,
    })
  })
})
