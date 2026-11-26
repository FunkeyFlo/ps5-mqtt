import lodash from "lodash"
import { expectSaga } from "redux-saga-test-plan"
import * as matchers from "redux-saga-test-plan/matchers"
import type { PutEffect } from "redux-saga/effects"
import {
  DeviceStatus,
  DeviceType,
  IDiscoveredDevice,
} from "playactor/dist/discovery/model"

import { discoverDevices as findDevicesOnNetwork } from "../../../playactor/discovery"
import { Settings, SETTINGS } from "../../../services"
import type { Device, State } from "../../types"
import { discoverDevices } from "../discover-devices"

jest.mock("../../../playactor/discovery")

const mockFindDevices = jest.mocked(findDevicesOnNetwork)

const settings = {
  allowPs4Devices: false,
  deviceDiscoveryBroadcastAddress: undefined,
} as Settings

describe("Discover Devices saga", () => {
  afterEach(() => {
    jest.clearAllMocks()
  })

  test("registers a console that is discovered for the first time", async () => {
    const dispatched = await discover([], [discovered()])

    expect(dispatched.map((a) => a.type)).toEqual(["REGISTER_DEVICE"])
    expect(dispatched[0].payload).toMatchObject({
      id: "mock-id-1",
      address: { address: "192.168.0.10", port: 9302 },
      available: true,
      normalizedName: "mock_ps5_1",
    })
  })

  test("leaves a tracked console alone while its address is unchanged", async () => {
    const dispatched = await discover([makeDevice()], [discovered()])

    expect(dispatched).toHaveLength(0)
  })

  test("re-registers a tracked console that came back on a new address", async () => {
    const tracked = makeDevice({
      available: false,
      status: "UNKNOWN",
      checkFailures: 2,
      transitioning: true,
    })

    const dispatched = await discover(
      [tracked],
      [
        discovered({
          address: { address: "192.168.0.44", port: 9302, family: "IPv4" },
        }),
      ],
    )

    expect(dispatched.map((a) => a.type)).toEqual(["REGISTER_DEVICE"])
    expect(dispatched[0].payload).toMatchObject({
      id: "mock-id-1",
      address: { address: "192.168.0.44", port: 9302 },
      available: false,
      status: "UNKNOWN",
      checkFailures: 2,
      transitioning: true,
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

function discovered(
  overrides: Partial<IDiscoveredDevice> = {},
): IDiscoveredDevice {
  return {
    address: { address: "192.168.0.10", port: 9302, family: "IPv4" },
    hostRequestPort: 997,
    extras: {},
    discoveryVersion: "00030010",
    systemVersion: "",
    id: "mock-id-1",
    name: "mock-ps5-1",
    status: DeviceStatus.AWAKE,
    type: DeviceType.PS5,
    ...overrides,
  }
}

async function discover(
  trackedDevices: Device[],
  discoveredDevices: IDiscoveredDevice[],
): Promise<DispatchedAction[]> {
  mockFindDevices.mockResolvedValue(discoveredDevices)

  const state: State = {
    devices: Object.fromEntries(
      trackedDevices.map((device) => [device.id, device]),
    ),
    accounts: {},
  }

  const { effects } = await expectSaga(discoverDevices)
    .provide([[matchers.getContext(SETTINGS), settings]])
    .withState(state)
    .run()

  return putActions(effects.put)
}

function putActions(puts: PutEffect[] | undefined): DispatchedAction[] {
  return (puts ?? []).map((effect) => effect.payload.action as DispatchedAction)
}
