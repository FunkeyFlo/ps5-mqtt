import type { Device, State } from "./types"

const getDeviceList = (state: State): Device[] => {
  return Object.values(state.devices);
}

const getDeviceRegistry = (state: State): Record<string, Device> => state.devices;

export { getDeviceList, getDeviceRegistry }
