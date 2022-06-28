import { Device, Ps5Status, State, SwitchStatus } from "./types"

const getDevices = (state: State): Device[] =>
  Object.values(state.device.devices)

const getStateMappings = (state: State): Record<Ps5Status, SwitchStatus> =>
  state.device.stateMapping

export { getDevices, getStateMappings }
