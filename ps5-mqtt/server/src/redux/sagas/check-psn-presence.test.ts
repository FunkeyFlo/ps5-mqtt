/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-empty-function */
import { runSaga } from 'redux-saga';

import { PsnAccount } from "../../psn-account";
import { updateAccount } from "../action-creators";
import { Account, State } from "../types";
import { checkPsnPresence } from './check-psn-presence';

jest.mock("../../psn-account");
jest.mock("../action-creators");

const mockPsnUpdateAccount = jest.mocked(PsnAccount.updateAccount);
const mockUpdateAccount = jest.mocked(updateAccount);

const mockAccount: Account = {
    accountId: "0000000000",
    accountName: "TestUser",
    authInfo: {
        accessToken: "",
        accessTokenExpiration: 0,
        refreshToken: "",
        refreshTokenExpiration: 0
    },
    npsso: "----",
    activity: undefined,
    preferredDevices: {}
}

// https://redux-saga.js.org/docs/advanced/Testing/
describe("Check PSN Presence saga", () => {

    afterEach(() => {
        mockPsnUpdateAccount.mockClear();
        mockUpdateAccount.mockClear();
    });

    test("can detect new account activity", async () => {
        mockPsnUpdateAccount.mockReturnValue(Promise.resolve(mockAccount));

        await runSaga({
            dispatch: (_action) => { },
            getState: () => (<Partial<State>>{
                accounts: {
                    "0": mockAccount
                }
            }),
        }, checkPsnPresence).toPromise();

        expect(mockUpdateAccount).toHaveBeenCalledWith(mockAccount);
    });
});