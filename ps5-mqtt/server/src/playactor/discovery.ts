import os from "os"
import { Discovery } from "playactor/dist/discovery"
import {
  DeviceType,
  IDiscoveredDevice,
  IDiscoveryNetwork,
  IDiscoveryNetworkFactory,
} from "playactor/dist/discovery/model"
import { StandardDiscoveryNetworkFactory } from "playactor/dist/discovery/standard"

const GLOBAL_BROADCAST_ADDRESS = "255.255.255.255"

/**
 * On a multihomed host (e.g. Home Assistant OS bridged onto both a primary
 * LAN and a secondary IoT VLAN), a discovery ping sent to the limited
 * broadcast address 255.255.255.255 is only ever routed out of whichever
 * single interface the OS routing table picks for that destination
 * (typically the interface holding the default route) - it does not fan out
 * to every attached subnet. A PS5 sitting on a non-default-route subnet
 * never receives the discovery request, so "refresh devices" silently finds
 * nothing. Each local interface's own subnet-directed broadcast address
 * (e.g. 192.168.2.255) matches a locally-attached route, so pinging those
 * too guarantees a correctly-routed request reaches every attached subnet
 * regardless of which one holds the default route.
 * https://github.com/FunkeyFlo/ps5-mqtt/issues/682
 */
export function getLocalSubnetBroadcastAddresses(): string[] {
  const addresses = new Set<string>()
  for (const ifaceAddresses of Object.values(os.networkInterfaces())) {
    for (const { family, internal, address, netmask } of ifaceAddresses ?? []) {
      if (family !== "IPv4" || internal) {
        continue
      }
      addresses.add(toBroadcastAddress(address, netmask))
    }
  }
  return [...addresses]
}

function toBroadcastAddress(address: string, netmask: string): string {
  const addressOctets = address.split(".").map(Number)
  const netmaskOctets = netmask.split(".").map(Number)
  return addressOctets
    .map((octet, i) => octet | (~netmaskOctets[i] & 0xff))
    .join(".")
}

/**
 * playactor's Discovery pings a single address and, per discover() call,
 * attaches one "message" listener per protocol (PS4 + PS5) to a UDP socket
 * that is shared process-wide. Running one Discovery per broadcast address
 * (as this module once did) therefore stacks 2 x (1 + number of local
 * interfaces) listeners on that one socket, which trips Node's default
 * MaxListeners of 10 on hosts with five or more interfaces (HAOS with its
 * docker bridges, for one) and logged a MaxListenersExceededWarning on every
 * discovery cycle (https://github.com/FunkeyFlo/ps5-mqtt/issues/692).
 * Pinging every target from one Discovery keeps the listener count at a
 * constant two no matter how many interfaces the host has.
 */
function createMultiTargetNetworkFactory(
  targets: string[],
): IDiscoveryNetworkFactory {
  const withMultiTargetPing = (
    network: IDiscoveryNetwork,
  ): IDiscoveryNetwork => ({
    close: () => network.close(),
    ping: async () => {
      await Promise.all(targets.map((target) => network.ping(target)))
    },
    send: (...args) => network.send(...args),
    sendBuffer: (...args) => network.sendBuffer(...args),
  })

  return {
    createRawMessages: (config, onMessage) =>
      withMultiTargetPing(
        StandardDiscoveryNetworkFactory.createRawMessages(config, onMessage),
      ),
    createMessages: (config, onMessage) =>
      withMultiTargetPing(
        StandardDiscoveryNetworkFactory.createMessages(config, onMessage),
      ),
    createDevices: (config, onDevice) =>
      withMultiTargetPing(
        StandardDiscoveryNetworkFactory.createDevices(config, onDevice),
      ),
  }
}

export interface DiscoverDevicesConfig {
  allowPs4Devices: boolean
  deviceDiscoveryBroadcastAddress?: string
  timeoutMillis: number
}

/**
 * A user-provided deviceDiscoveryBroadcastAddress is an explicit override
 * (e.g. for a documented single-VLAN setup) and is used as-is, unchanged
 * from prior behavior. Otherwise every attached subnet's broadcast address
 * is targeted alongside the global broadcast, so single-homed setups keep
 * working exactly as before while multihomed setups now reach every subnet.
 */
export async function discoverDevices({
  allowPs4Devices,
  deviceDiscoveryBroadcastAddress,
  timeoutMillis,
}: DiscoverDevicesConfig): Promise<IDiscoveredDevice[]> {
  const broadcastAddresses = deviceDiscoveryBroadcastAddress
    ? [deviceDiscoveryBroadcastAddress]
    : [GLOBAL_BROADCAST_ADDRESS, ...getLocalSubnetBroadcastAddresses()]

  const discoveredById = new Map<string, IDiscoveredDevice>()
  const discovery = new Discovery(
    { timeoutMillis },
    createMultiTargetNetworkFactory(broadcastAddresses),
  )
  for await (const device of discovery.discover()) {
    discoveredById.set(device.id, device)
  }

  const devices = [...discoveredById.values()]
  return allowPs4Devices
    ? devices
    : devices.filter((device) => device.type === DeviceType.PS5)
}
