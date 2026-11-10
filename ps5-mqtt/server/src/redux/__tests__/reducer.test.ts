import { psnPresenceUnavailable, updateAccount } from "../action-creators"
import reducer from "../reducer"
import type { Account } from "../types"

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
