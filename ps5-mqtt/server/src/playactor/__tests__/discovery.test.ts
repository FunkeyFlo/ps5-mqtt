import os from "os"
import { Discovery } from "playactor/dist/discovery"
import { DeviceType, IDiscoveredDevice } from "playactor/dist/discovery/model"

import {
  discoverDevices,
  getLocalSubnetBroadcastAddresses,
} from "../discovery"

jest.mock("os")
jest.mock("playactor/dist/discovery")

const mockNetworkInterfaces = jest.mocked(os.networkInterfaces)
const MockDiscovery = jest.mocked(Discovery)

const asyncIterableOf = (devices: IDiscoveredDevice[]): AsyncIterable<IDiscoveredDevice> => ({
  [Symbol.asyncIterator]: async function* () {
    for (const device of devices) {
      yield device
    }
  },
})

const device = (id: string, type: DeviceType): IDiscoveredDevice =>
  ({
    id,
    type,
    name: id,
  }) as IDiscoveredDevice

const iface = (address: string, netmask: string, internal = false) => [
  { address, netmask, family: "IPv4", internal },
]

beforeEach(() => {
  MockDiscovery.mockReset()
  mockNetworkInterfaces.mockReset()
})

describe("getLocalSubnetBroadcastAddresses", () => {
  it("computes the subnet-directed broadcast address for every non-internal IPv4 interface", () => {
    mockNetworkInterfaces.mockReturnValue({
      lo: iface("127.0.0.1", "255.0.0.0", true),
      primary: iface("192.168.1.50", "255.255.255.0"),
      iotVlan: iface("10.20.0.5", "255.255.255.0"),
    } as unknown as ReturnType<typeof os.networkInterfaces>)

    expect(getLocalSubnetBroadcastAddresses().sort()).toEqual(
      ["10.20.0.255", "192.168.1.255"].sort(),
    )
  })
})

describe("discoverDevices", () => {
  // Regression test for https://github.com/FunkeyFlo/ps5-mqtt/issues/682:
  // on a multihomed host (HAOS bridged onto both a primary LAN and an
  // "iot-cloud" VLAN), the discovery ping used to target only the global
  // broadcast address, which the OS routes out a single interface (usually
  // the default route). A PS5 sitting on the non-default-route subnet was
  // never reached. This asserts every attached subnet's broadcast address is
  // pinged too, so the device is found regardless of the default route.
  it("finds a device that only answers on a secondary subnet's broadcast address", async () => {
    mockNetworkInterfaces.mockReturnValue({
      primary: iface("192.168.1.50", "255.255.255.0"),
      iotVlan: iface("10.20.0.5", "255.255.255.0"),
    } as unknown as ReturnType<typeof os.networkInterfaces>)

    const ps5OnVlan = device("ps5-on-vlan", DeviceType.PS5)

    MockDiscovery.mockImplementation(
      ({ deviceIp } = {}) =>
        ({
          discover: () =>
            deviceIp === "10.20.0.255"
              ? asyncIterableOf([ps5OnVlan])
              : asyncIterableOf([]),
        }) as unknown as Discovery,
    )

    const result = await discoverDevices({
      allowPs4Devices: true,
      timeoutMillis: 1000,
    })

    const pingedAddresses = MockDiscovery.mock.calls.map(
      ([config]) => config?.deviceIp,
    )
    expect(pingedAddresses.sort()).toEqual(
      ["255.255.255.255", "10.20.0.255", "192.168.1.255"].sort(),
    )
    expect(result).toEqual([ps5OnVlan])
  })

  it("uses only the explicit override address when deviceDiscoveryBroadcastAddress is configured", async () => {
    mockNetworkInterfaces.mockReturnValue({
      primary: iface("192.168.1.50", "255.255.255.0"),
      iotVlan: iface("10.20.0.5", "255.255.255.0"),
    } as unknown as ReturnType<typeof os.networkInterfaces>)

    const ps5 = device("ps5-1", DeviceType.PS5)
    MockDiscovery.mockImplementation(
      () => ({ discover: () => asyncIterableOf([ps5]) }) as unknown as Discovery,
    )

    await discoverDevices({
      allowPs4Devices: true,
      deviceDiscoveryBroadcastAddress: "10.20.0.255",
      timeoutMillis: 1000,
    })

    expect(MockDiscovery).toHaveBeenCalledTimes(1)
    expect(MockDiscovery).toHaveBeenCalledWith(
      expect.objectContaining({ deviceIp: "10.20.0.255" }),
    )
  })

  it("filters out non-PS5 devices when allowPs4Devices is false", async () => {
    mockNetworkInterfaces.mockReturnValue({})

    const ps5 = device("ps5-1", DeviceType.PS5)
    const ps4 = device("ps4-1", DeviceType.PS4)
    MockDiscovery.mockImplementation(
      () =>
        ({ discover: () => asyncIterableOf([ps5, ps4]) }) as unknown as Discovery,
    )

    const result = await discoverDevices({
      allowPs4Devices: false,
      timeoutMillis: 1000,
    })

    expect(result).toEqual([ps5])
  })

  it("deduplicates a device answered on more than one broadcast target", async () => {
    mockNetworkInterfaces.mockReturnValue({
      primary: iface("192.168.1.50", "255.255.255.0"),
    } as unknown as ReturnType<typeof os.networkInterfaces>)

    const ps5 = device("ps5-1", DeviceType.PS5)
    MockDiscovery.mockImplementation(
      () => ({ discover: () => asyncIterableOf([ps5]) }) as unknown as Discovery,
    )

    const result = await discoverDevices({
      allowPs4Devices: true,
      timeoutMillis: 1000,
    })

    expect(result).toEqual([ps5])
  })
})
