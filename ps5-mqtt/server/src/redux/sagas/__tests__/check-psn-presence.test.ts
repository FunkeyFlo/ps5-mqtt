import lodash from "lodash"
import { expectSaga } from "redux-saga-test-plan"

import { PsnAccount } from "../../../psn-account"
import { psnPresenceUnavailable, updateAccount } from "../../action-creators"
import { Account, State } from "../../types"
import { checkPsnPresence } from "../check-psn-presence"

jest.mock("../../../psn-account")

const mockPsnUpdateAccount = jest.mocked(PsnAccount.updateAccount)

describe("Check PSN Presence saga", () => {
  afterEach(() => {
    jest.clearAllMocks()
  })

  test("can detect new account activity", async () => {
    const mockAccount = makeAccount()
    mockPsnUpdateAccount.mockResolvedValue(mockAccount)

    await expectSaga(checkPsnPresence)
      .withState(<State>{ accounts: { "0": mockAccount }, devices: {} })
      .put(updateAccount(mockAccount))
      .run()
  })

  test("one account failing neither stops other accounts nor reports it offline", async () => {
    const failing = makeAccount({ accountId: "1", accountName: "Failing" })
    const healthy = makeAccount({ accountId: "2", accountName: "Healthy" })
    const healthyUpdated = makeAccount({
      accountId: "2",
      accountName: "Healthy",
      presenceAvailable: true,
    })
    mockPsnUpdateAccount.mockImplementation(async (account) => {
      if (account.accountId === "1") {
        throw new Error("token refresh failed")
      }
      return healthyUpdated
    })

    await expectSaga(checkPsnPresence)
      .withState(<State>{
        accounts: { "1": failing, "2": healthy },
        devices: {},
      })
      .put(psnPresenceUnavailable("1"))
      .put(updateAccount(healthyUpdated))
      .run()
  })

  test("a failing account listed last does not undo earlier accounts", async () => {
    const healthy = makeAccount({ accountId: "1", presenceAvailable: true })
    const failing = makeAccount({ accountId: "2" })
    mockPsnUpdateAccount.mockImplementation(async (account) => {
      if (account.accountId === "2") {
        throw new Error("boom")
      }
      return healthy
    })

    await expectSaga(checkPsnPresence)
      .withState(<State>{
        accounts: { "1": healthy, "2": failing },
        devices: {},
      })
      .put(updateAccount(healthy))
      .put(psnPresenceUnavailable("2"))
      .run()
  })
})

// --- helpers ---

const DEFAULT_ACCOUNT: Account = {
  accountId: "0000000000",
  accountName: "TestUser",
  authInfo: {
    accessToken: "",
    accessTokenExpiration: 0,
    refreshToken: "",
    refreshTokenExpiration: 0,
  },
  npsso: "----",
  activity: undefined,
  preferredDevices: {},
}

function makeAccount(overrides: Partial<Account> = {}): Account {
  return lodash.merge({}, DEFAULT_ACCOUNT, overrides)
}
