/* eslint-disable @typescript-eslint/no-empty-function */
import { runSaga } from 'redux-saga';

import { PsnAccount } from "../../psn-account";
import { Device, State } from '../types';
import { updateAccount } from './update-account';

jest.mock("../action-creators", () => {
    const originalModule = jest.requireActual('../action-creators');

    return {
        __esModule: true, // Use it when dealing with esModules
        ...originalModule,
        updateHomeAssistant: jest.fn(originalModule.updateHomeAssistant),
    };
});

const mockAccountBase: PsnAccount = {
    accountId: "mock-account-id-1",
    accountName: "TestUser1",
    authInfo: {
        accessToken: "",
        accessTokenExpiration: 0,
        refreshToken: "",
        refreshTokenExpiration: 0
    },
    npsso: "----"
}

const ps5Device1: Device = {
    address: { address: "192.168.0.10", port: 80 },
    available: true,
    id: "mock-id-1",
    name: "mock-ps5-1",
    normalizedName: "mock_ps5_1",
    status: 'AWAKE',
    systemVersion: "",
    transitioning: false,
    type: 'PS5',
    activity: undefined,
}

describe("Check PSN Presence saga", () => {
    afterEach(() => {
        jest.clearAllMocks();
    });

    test("can match account activity to a single device", async () => {
        const mockAccount: PsnAccount = {
            ...mockAccountBase,
            activity: {
                launchPlatform: 'PS5',
                platform: 'PS5',
                titleId: "Game 1",
                titleImage: "http://somegameurl.net/path-to-game1-image",
                titleName: "GAME1ID"
            }
        };

        const dispatched = [];
        await runSaga({
            dispatch: (action) => {
                return dispatched.push(action)
            },
            getState: () => (<Partial<State>>{
                devices: {
                    [ps5Device1.id]: ps5Device1
                }
            }),
        }, updateAccount, {
            payload: mockAccount,
            type: 'UPDATE_PSN_ACCOUNT'
        }).toPromise();

        expect(jest.requireMock("../action-creators").updateHomeAssistant).toHaveBeenCalledWith(<Device>{
            ...ps5Device1,
            activity: {
                ...mockAccount.activity,
                activePlayers: [mockAccountBase.accountName],
            }
        });
    });

    test("will match account activity only to the first available device of the same type", async () => {
        const mockAccount: PsnAccount = {
            ...mockAccountBase,
            activity: {
                launchPlatform: 'PS5',
                platform: 'PS5',
                titleId: "Game 1",
                titleImage: "http://somegameurl.net/path-to-game1-image",
                titleName: "GAME1ID"
            }
        };

        const ps5Device2: Device = {
            address: { address: "192.168.0.11", port: 80 },
            available: true,
            id: "mock-id-2",
            name: "mock-ps5-2",
            normalizedName: "mock_ps5_2",
            status: 'AWAKE',
            systemVersion: "",
            transitioning: false,
            type: 'PS5',
            activity: undefined,
        }

        const dispatched = [];
        await runSaga({
            dispatch: (action) => {
                return dispatched.push(action)
            },
            getState: () => (<Partial<State>>{
                devices: {
                    [ps5Device1.id]: ps5Device1,
                    [ps5Device2.id]: ps5Device2,
                }
            }),
        }, updateAccount, {
            payload: mockAccount,
            type: 'UPDATE_PSN_ACCOUNT'
        }).toPromise();

        const mockedUpdateHa = jest.requireMock("../action-creators").updateHomeAssistant;

        expect(mockedUpdateHa).toHaveBeenCalledWith(<Device>{
            ...ps5Device1,
            activity: {
                ...mockAccount.activity,
                activePlayers: [mockAccountBase.accountName],
            }
        });
        expect(mockedUpdateHa).toHaveBeenCalledTimes(1);
    });
});
