import { runSaga } from "redux-saga"

import { PsnAuthStore } from "../../../psn-auth-store"
import type {
  Account,
  PersistProvisionalPsnTokensAction,
  UpdateAccountAction,
} from "../../types"
import { persistPsnAccount } from "../persist-psn-account"

jest.mock("../../../psn-auth-store")

const mockedFindByAccountId = jest.mocked(PsnAuthStore.findByAccountId)
const mockedFindByNpsso = jest.mocked(PsnAuthStore.findByNpsso)
const mockedSave = jest.mocked(PsnAuthStore.save)
const mockedResolveKey = jest.mocked(PsnAuthStore.resolveKey)
const mockedHashNpsso = jest.mocked(PsnAuthStore.hashNpsso)

const npsso = "npsso-value"

const account: Account = {
  accountId: "account-1",
  accountName: "MyPsnUser",
  npsso,
  authInfo: {
    accessToken: "fresh-access-token",
    accessTokenExpiration: Date.now() + 1000 * 60 * 60,
    refreshToken: "fresh-refresh-token",
    refreshTokenExpiration: Date.now() + 1000 * 60 * 60 * 24 * 60,
  },
  preferredDevices: {},
}

function run(
  action: UpdateAccountAction | PersistProvisionalPsnTokensAction,
) {
  return runSaga(
    { dispatch: () => {}, getState: () => undefined },
    persistPsnAccount,
    action,
  ).toPromise()
}

describe("persistPsnAccount saga", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockedResolveKey.mockImplementation((accountId, rawNpsso) =>
      accountId ? accountId : `hash(${rawNpsso})`,
    )
    mockedHashNpsso.mockImplementation((rawNpsso) => `hash(${rawNpsso})`)
  })

  test("persists a brand new account and migrates away from the provisional key", async () => {
    mockedFindByAccountId.mockResolvedValue(undefined)

    await run({ type: "UPDATE_PSN_ACCOUNT", payload: account })

    expect(mockedFindByAccountId).toHaveBeenCalledWith("account-1")
    expect(mockedSave).toHaveBeenCalledWith(
      "account-1",
      {
        npssoHash: `hash(${npsso})`,
        accountId: "account-1",
        accountName: "MyPsnUser",
        authInfo: account.authInfo,
      },
      `hash(${npsso})`,
    )
  })

  test("skips the write when the tokens haven't changed", async () => {
    mockedFindByAccountId.mockResolvedValue({
      npssoHash: `hash(${npsso})`,
      accountId: "account-1",
      accountName: "MyPsnUser",
      authInfo: account.authInfo,
      updatedAt: "2024-01-01",
    })

    await run({ type: "UPDATE_PSN_ACCOUNT", payload: account })

    expect(mockedSave).not.toHaveBeenCalled()
  })

  test("persists when the tokens have changed since the last write", async () => {
    mockedFindByAccountId.mockResolvedValue({
      npssoHash: `hash(${npsso})`,
      accountId: "account-1",
      accountName: "MyPsnUser",
      authInfo: {
        ...account.authInfo,
        accessToken: "stale-access-token",
      },
      updatedAt: "2024-01-01",
    })

    await run({ type: "UPDATE_PSN_ACCOUNT", payload: account })

    expect(mockedSave).toHaveBeenCalledTimes(1)
  })

  test("persists provisional tokens keyed by the NPSSO hash, with no accountId yet", async () => {
    mockedFindByNpsso.mockResolvedValue(undefined)

    await run({
      type: "PERSIST_PROVISIONAL_PSN_TOKENS",
      payload: {
        npsso,
        authInfo: account.authInfo,
        accountName: "MyPsnUser",
      },
    })

    expect(mockedFindByNpsso).toHaveBeenCalledWith(npsso)
    expect(mockedSave).toHaveBeenCalledWith(
      `hash(${npsso})`,
      {
        npssoHash: `hash(${npsso})`,
        accountId: undefined,
        accountName: "MyPsnUser",
        authInfo: account.authInfo,
      },
      undefined,
    )
  })
})
