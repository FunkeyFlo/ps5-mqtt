import type { Device, State } from "./types"

const getDevices = (state: State): Device[] =>
  Object.values(state.devices)

export { getDevices }
