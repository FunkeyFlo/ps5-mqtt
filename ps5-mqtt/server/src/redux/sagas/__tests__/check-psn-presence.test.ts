import lodash from "lodash"
import { expectSaga } from "redux-saga-test-plan"

import { PsnAccount } from "../../../psn-account"
import { updateAccount } from "../../action-creators"
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
