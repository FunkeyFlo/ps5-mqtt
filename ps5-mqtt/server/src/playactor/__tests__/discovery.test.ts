import dgram from "dgram"
import { EventEmitter } from "events"
import os from "os"
import { DeviceType } from "playactor/dist/discovery/model"

import { discoverDevices, getLocalSubnetBroadcastAddresses } from "../discovery"

jest.mock("os")
jest.mock("dgram")

const mockNetworkInterfaces = jest.mocked(os.networkInterfaces)
const mockCreateSocket = jest.mocked(dgram.createSocket)

const iface = (address: string, netmask: string, internal = false) => [
  { address, netmask, family: "IPv4", internal },
]

const mockInterfaces = (...addresses: string[]) =>
  mockNetworkInterfaces.mockReturnValue(
    Object.fromEntries(
      addresses.map((address, i) => [
        `eth${i}`,
        iface(address, "255.255.255.0"),
      ]),
    ) as unknown as ReturnType<typeof os.networkInterfaces>,
  )

const deviceResponse = (id: string, type: "PS4" | "PS5") =>
  Buffer.from(
    [
      "HTTP/1.1 200 Ok",
      `host-id:${id}`,
      `host-type:${type}`,
      `host-name:${id}`,
      "host-request-port:997",
      "system-version:07020001",
      "device-discovery-protocol-version:00030010",
      "",
    ].join("\n"),
  )

/**
 * Stand-in for playactor's UDP socket. Answers a discovery ping with a device
 * response only when the ping targets an address in `answersOn`, the way a
 * real console only hears a broadcast routed out of its own subnet.
 */
class FakeSocket extends EventEmitter {
  peakMessageListeners = 0
  readonly pingedAddresses: string[] = []

  constructor(private readonly answersOn: Map<string, Buffer>) {
    super()
    this.on("newListener", () => {
      // "newListener" fires before the listener is attached
      this.peakMessageListeners = Math.max(
        this.peakMessageListeners,
        this.listenerCount("message") + 1,
      )
    })
  }

  bind(_port: unknown, _address: unknown, callback?: () => void) {
    callback?.()
  }
  setBroadcast() {}
  address() {
    return { address: "0.0.0.0", port: 0 }
  }
  close() {}
  send(_message: Buffer, _port: number, address: string) {
    this.pingedAddresses.push(address)
    const response = this.answersOn.get(address)
    if (response) {
      setImmediate(() =>
        this.emit("message", response, { address: "192.0.2.1", port: 987 }),
      )
    }
  }
}

let sockets: FakeSocket[]
let answersOn: Map<string, Buffer>

beforeEach(() => {
  sockets = []
  answersOn = new Map()
  mockNetworkInterfaces.mockReset()
  mockCreateSocket.mockReset()
  mockCreateSocket.mockImplementation(() => {
    const socket = new FakeSocket(answersOn)
    sockets.push(socket)
    return socket as unknown as dgram.Socket
  })
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
    mockInterfaces("192.168.1.50", "10.20.0.5")
    answersOn.set("10.20.0.255", deviceResponse("ps5-on-vlan", "PS5"))

    const result = await discoverDevices({
      allowPs4Devices: true,
      timeoutMillis: 100,
    })

    expect(new Set(sockets.flatMap((s) => s.pingedAddresses))).toEqual(
      new Set(["255.255.255.255", "10.20.0.255", "192.168.1.255"]),
    )
    expect(result.map((d) => d.id)).toEqual(["ps5-on-vlan"])
  })

  // Regression test for https://github.com/FunkeyFlo/ps5-mqtt/issues/692:
  // every discovery used to attach its own pair of "message" listeners to the
  // one UDP socket playactor shares, so a host with five or more interfaces
  // went past Node's default limit of 10 and logged a
  // MaxListenersExceededWarning on every discovery cycle.
  it("keeps the socket's message listeners constant no matter how many interfaces the host has", async () => {
    const peakListeners = async (interfaceCount: number) => {
      mockInterfaces(
        ...Array.from({ length: interfaceCount }, (_, i) => `10.0.${i}.5`),
      )
      sockets = []
      for (let cycle = 0; cycle < 3; cycle++) {
        await discoverDevices({ allowPs4Devices: true, timeoutMillis: 50 })
      }
      return Math.max(...sockets.map((s) => s.peakMessageListeners))
    }

    const withTwoInterfaces = await peakListeners(2)
    const withTwelveInterfaces = await peakListeners(12)

    expect(withTwelveInterfaces).toBe(withTwoInterfaces)
    expect(withTwelveInterfaces).toBeLessThanOrEqual(
      EventEmitter.defaultMaxListeners,
    )
  })

  it("uses only the explicit override address when deviceDiscoveryBroadcastAddress is configured", async () => {
    mockInterfaces("192.168.1.50", "10.20.0.5")
    answersOn.set("10.20.0.255", deviceResponse("ps5-1", "PS5"))

    const result = await discoverDevices({
      allowPs4Devices: true,
      deviceDiscoveryBroadcastAddress: "10.20.0.255",
      timeoutMillis: 100,
    })

    expect(new Set(sockets.flatMap((s) => s.pingedAddresses))).toEqual(
      new Set(["10.20.0.255"]),
    )
    expect(result.map((d) => d.id)).toEqual(["ps5-1"])
  })

  it("filters out non-PS5 devices when allowPs4Devices is false", async () => {
    mockNetworkInterfaces.mockReturnValue({})
    answersOn.set("255.255.255.255", deviceResponse("ps5-1", "PS5"))

    const result = await discoverDevices({
      allowPs4Devices: false,
      timeoutMillis: 100,
    })
    expect(result.map((d) => d.type)).toEqual([DeviceType.PS5])

    answersOn.set("255.255.255.255", deviceResponse("ps4-1", "PS4"))
    const ps4Only = await discoverDevices({
      allowPs4Devices: false,
      timeoutMillis: 100,
    })
    expect(ps4Only).toEqual([])
  })

  it("deduplicates a device answered on more than one broadcast target", async () => {
    mockInterfaces("192.168.1.50")
    const response = deviceResponse("ps5-1", "PS5")
    answersOn.set("255.255.255.255", response)
    answersOn.set("192.168.1.255", response)

    const result = await discoverDevices({
      allowPs4Devices: true,
      timeoutMillis: 100,
    })

    expect(result.map((d) => d.id)).toEqual(["ps5-1"])
  })
})
