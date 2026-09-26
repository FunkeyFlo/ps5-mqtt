import os from "os"
import { Discovery } from "playactor/dist/discovery"
import { DeviceType, IDiscoveredDevice } from "playactor/dist/discovery/model"

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
  await Promise.all(
    broadcastAddresses.map(async (deviceIp) => {
      const discovery = new Discovery({ deviceIp, timeoutMillis })
      for await (const device of discovery.discover()) {
        discoveredById.set(device.id, device)
      }
    }),
  )

  const devices = [...discoveredById.values()]
  return allowPs4Devices
    ? devices
    : devices.filter((device) => device.type === DeviceType.PS5)
}
