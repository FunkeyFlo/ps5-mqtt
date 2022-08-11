import { PsnAccount } from "../psn-account";
import type { Device, State } from "./types"

const getDeviceList = (state: State): Device[] => {
  return Object.values(state.devices);
}

const getAccounts = (state: State): PsnAccount[] => {
  return Object.values(state.accounts)
}

const getDeviceRegistry = (state: State): Record<string, Device> => state.devices;

export {
  getDeviceList,
  getDeviceRegistry,

  getAccounts,
}
