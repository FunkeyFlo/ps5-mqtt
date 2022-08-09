import { merge, isEqual } from "lodash";
import { call, put, select } from "redux-saga/effects";
import { PsnAccount } from "../../psn-account";
import { createErrorLogger } from "../../util/error-logger";
import { updateAccount } from "../action-creators";
import { getAccounts } from "../selectors";

// const debug = createDebugger("@ha:ps5:checkPsnPresence");
const errorLogger = createErrorLogger();

function* checkPsnPresence() {
    try {
        const accounts: PsnAccount[] = yield select(getAccounts);

        for (const account of accounts) {
            const updatedAccount: PsnAccount = yield call<
                typeof PsnAccount.updateAccount
            >(
                PsnAccount.updateAccount,
                account
            );

            // only update account if it has truly changed
            if(!isEqual(account, updatedAccount)) {   
                yield put(
                    updateAccount(
                        merge({}, updatedAccount)
                    )
                );
            }
        }
    } catch (e) {
        errorLogger(e);
    }
}

export { checkPsnPresence };

