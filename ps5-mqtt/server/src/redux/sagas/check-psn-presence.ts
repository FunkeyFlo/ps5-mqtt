import { call, put, select } from "redux-saga/effects"
import { PsnAccount } from "../../psn-account"
import { createErrorLogger } from "../../util/error-logger"
import { psnPresenceUnavailable, updateAccount } from "../action-creators"
import { getAccounts } from "../selectors"
import { Account } from "../types"

// const debug = createDebugger("@ha:ps5:checkPsnPresence");
const errorLogger = createErrorLogger()

function* checkPsnPresence() {
  try {
    const accounts: Account[] = yield select(getAccounts)

    for (const account of accounts) {
      // isolated per account so one account's failure (e.g. unrefreshable
      // tokens) neither stops the other accounts nor reads as "offline"
      try {
        const updatedAccount = yield call<typeof PsnAccount.updateAccount>(
          PsnAccount.updateAccount,
          account,
        )

        yield put(updateAccount(updatedAccount))
      } catch (e) {
        errorLogger(e)
        yield put(psnPresenceUnavailable(account.accountId))
      }
    }
  } catch (e) {
    errorLogger(e)
  }
}

export { checkPsnPresence }
