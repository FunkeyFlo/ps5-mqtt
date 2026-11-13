import {
  addDevice,
  psnPresenceUnavailable,
  setTransitioning,
  updateAccount,
  updateDevice,
} from "../action-creators"
import reducer from "../reducer"
import type { Account, Device } from "../types"

const makeAccount = (overrides: Partial<Account> = {}): Account => ({
  accountId: "111",
  accountName: "Neal",
  npsso: "x",
  authInfo: {
    accessToken: "",
    accessTokenExpiration: 0,
    refreshToken: "",
    refreshTokenExpiration: 0,
  },
  preferredDevices: {},
  presenceAvailable: true,
  presence: { online: true, lastOnline: null, platform: "PS5", polledAt: 1 },
  ...overrides,
})

const makeDevice = (overrides: Partial<Device> = {}): Device => ({
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
  ...overrides,
})

describe("reducer: devices", () => {
  test("UPDATE_DEVICE merges partial device fields without touching unknown devices", () => {
    let state = reducer(undefined, addDevice(makeDevice()))
    state = reducer(state, updateDevice({ id: "mock-id-1", checkFailures: 1 }))
    state = reducer(state, updateDevice({ id: "unknown-id", checkFailures: 1 }))

    expect(state.devices["mock-id-1"].checkFailures).toBe(1)
    expect(state.devices["unknown-id"]).toBeUndefined()
  })

  test("TRANSITIONING action resets checkFailures to 0", () => {
    let state = reducer(undefined, addDevice(makeDevice({ checkFailures: 1 })))
    expect(state.devices["mock-id-1"].checkFailures).toBe(1)

    state = reducer(
      state,
      setTransitioning({ id: "mock-id-1", transitioning: true }),
    )
    expect(state.devices["mock-id-1"].transitioning).toBe(true)
    expect(state.devices["mock-id-1"].checkFailures).toBe(0)
  })
})

describe("reducer: account presence", () => {
  test("a presence failure flags only that account and keeps its last known presence", () => {
    let state = reducer(undefined, updateAccount(makeAccount()))
    state = reducer(
      state,
      updateAccount(makeAccount({ accountId: "222", accountName: "Sam" })),
    )

    state = reducer(state, psnPresenceUnavailable("111"))

    expect(state.accounts["111"].presenceAvailable).toBe(false)
    expect(state.accounts["111"].presence?.online).toBe(true)
    expect(state.accounts["222"].presenceAvailable).toBe(true)
  })

  test("ignores a failure for an unknown account", () => {
    const state = reducer(undefined, psnPresenceUnavailable("999"))

    expect(state.accounts).toEqual({})
  })

  test("a later successful poll makes the account available again", () => {
    let state = reducer(undefined, updateAccount(makeAccount()))
    state = reducer(state, psnPresenceUnavailable("111"))
    state = reducer(state, updateAccount(makeAccount()))

    expect(state.accounts["111"].presenceAvailable).toBe(true)
  })
})
