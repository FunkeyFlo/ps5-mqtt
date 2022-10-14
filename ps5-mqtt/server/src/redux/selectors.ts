import type { Device, State, Account } from "./types"

const getDeviceList = (state: State): Device[] => {
  return Object.values(state.devices);
}

const getAccounts = (state: State): Account[] => {
  return Object.values(state.accounts)
}

const getDeviceRegistry = (state: State): Record<string, Device> => state.devices;

export {
  getDeviceList,
  getDeviceRegistry,

  getAccounts,
}
