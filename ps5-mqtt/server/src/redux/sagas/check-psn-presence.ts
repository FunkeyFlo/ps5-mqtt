import { call, put, select } from "redux-saga/effects";
import { PsnAccount } from "../../psn-account";
import { createErrorLogger } from "../../util/error-logger";
import { updateAccount } from "../action-creators";
import { getAccounts } from "../selectors";
import { Account } from "../types";

// const debug = createDebugger("@ha:ps5:checkPsnPresence");
const errorLogger = createErrorLogger();

function* checkPsnPresence() {
    try {
        const accounts: Account[] = yield select(getAccounts);

        for (const account of accounts) {
            const updatedAccount = yield call<
                typeof PsnAccount.updateAccount
            >(
                PsnAccount.updateAccount,
                account
            );

            yield put(
                updateAccount(updatedAccount)
            );
        }
    } catch (e) {
        errorLogger(e);
    }
}

export { checkPsnPresence };

