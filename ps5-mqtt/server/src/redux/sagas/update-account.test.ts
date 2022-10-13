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
        updateHomeAssistant: jest.fn((device) => ({
            type: "UPDATE_HOME_ASSISTANT",
            payload: device,
        })),
    };
});

describe("Check PSN Presence saga", () => {
    afterEach(() => {
        jest.clearAllMocks();
    });

    test("can match account activity to a single device", async () => {
        //#region MOCKS
        const mockAccount: PsnAccount = {
            accountId: "mock-account-id-1",
            accountName: "TestUser1",
            authInfo: {
                accessToken: "",
                accessTokenExpiration: 0,
                refreshToken: "",
                refreshTokenExpiration: 0
            },
            npsso: "----",
            activity: {
                launchPlatform: 'PS5',
                platform: 'PS5',
                titleId: "Game 1",
                titleImage: "http://somegameurl.net/path-to-game1-image",
                titleName: "GAME1ID"
            }
        };

        const mockDevice: Device = {
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
        //#endregion MOCKS

        const dispatched = [];
        await runSaga({
            dispatch: (action) => {
                return dispatched.push(action)
            },
            getState: () => (<Partial<State>>{
                devices: {
                    [mockDevice.id]: mockDevice
                }
            }),
        }, updateAccount, {
            payload: mockAccount,
            type: 'UPDATE_PSN_ACCOUNT'
        }).toPromise();

        expect(jest.requireMock("../action-creators").updateHomeAssistant).toHaveBeenCalledWith(<Device>{
            ...mockDevice,
            activity: {
                ...mockAccount.activity,
                activePlayers: [mockAccount.accountName],
            }
        });
    });

    test("will match account activity only to the first available device of the same type", async () => {
        //#region MOCKS
        const mockAccount: PsnAccount = {
            accountId: "mock-account-id-1",
            accountName: "TestUser1",
            authInfo: {
                accessToken: "",
                accessTokenExpiration: 0,
                refreshToken: "",
                refreshTokenExpiration: 0
            },
            npsso: "----",
            activity: {
                launchPlatform: 'PS5',
                platform: 'PS5',
                titleId: "Game 1",
                titleImage: "http://somegameurl.net/path-to-game1-image",
                titleName: "GAME1ID"
            }
        };

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
        //#endregion MOCKS

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
                activePlayers: [mockAccount.accountName],
            }
        });
        expect(mockedUpdateHa).toHaveBeenCalledTimes(1);
    });

    test("will match account activity only to a device that's 'Awake'", async () => {
        //#region MOCKS
        const mockAccount: PsnAccount = {
            accountId: "mock-account-id-1",
            accountName: "TestUser1",
            authInfo: {
                accessToken: "",
                accessTokenExpiration: 0,
                refreshToken: "",
                refreshTokenExpiration: 0
            },
            npsso: "----",
            activity: {
                launchPlatform: 'PS5',
                platform: 'PS5',
                titleId: "Game 1",
                titleImage: "http://somegameurl.net/path-to-game1-image",
                titleName: "GAME1ID"
            }
        };

        const ps5Device1: Device = {
            address: { address: "192.168.0.10", port: 80 },
            available: true,
            id: "mock-id-1",
            name: "mock-ps5-1",
            normalizedName: "mock_ps5_1",
            status: 'STANDBY',
            systemVersion: "",
            transitioning: false,
            type: 'PS5',
            activity: undefined,
        }

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
        //#endregion MOCKS

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
            ...ps5Device2,
            activity: {
                ...mockAccount.activity,
                activePlayers: [mockAccount.accountName],
            }
        });
        expect(mockedUpdateHa).toHaveBeenCalledTimes(1);
    });

    test("will add player to existing activity when another player is already active on the console", async () => {
        //#region MOCKS
        const mockActivity: PsnAccount.AccountActivity = {
            launchPlatform: 'PS5',
            platform: 'PS5',
            titleId: "Game 1",
            titleImage: "http://somegameurl.net/path-to-game1-image",
            titleName: "GAME1ID"
        }

        const x = {
            authInfo: {
                accessToken: "",
                accessTokenExpiration: 0,
                refreshToken: "",
                refreshTokenExpiration: 0
            },
            npsso: "----",
        }

        const mockAccount1: PsnAccount = {
            accountId: "mock-account-id-1",
            accountName: "TestUser1",
            activity: mockActivity,
            ...x,
        };

        const mockAccount2: PsnAccount = {
            accountId: "mock-account-id-2",
            accountName: "TestUser2",
            activity: mockActivity,
            ...x,
        };

        const mockDevice: Device = {
            address: { address: "192.168.0.10", port: 80 },
            available: true,
            id: "mock-id-1",
            name: "mock-ps5-1",
            normalizedName: "mock_ps5_1",
            status: 'AWAKE',
            systemVersion: "",
            transitioning: false,
            type: 'PS5',
            activity: {
                ...mockActivity,
                activePlayers: [mockAccount1.accountName]
            },
        }
        //#endregion MOCKS

        const dispatched = [];
        await runSaga({
            dispatch: (action) => {
                return dispatched.push(action)
            },
            getState: () => (<Partial<State>>{
                devices: {
                    [mockDevice.id]: mockDevice
                }
            }),
        }, updateAccount, {
            payload: mockAccount2,
            type: 'UPDATE_PSN_ACCOUNT'
        }).toPromise();

        const mockedUpdateHa = jest.requireMock("../action-creators").updateHomeAssistant;

        expect(mockedUpdateHa).toHaveBeenCalledWith(<Device>{
            address: { address: "192.168.0.10", port: 80 },
            available: true,
            id: "mock-id-1",
            name: "mock-ps5-1",
            normalizedName: "mock_ps5_1",
            status: 'AWAKE',
            systemVersion: "",
            transitioning: false,
            type: 'PS5',
            activity: {
                ...mockActivity,
                activePlayers: [mockAccount1.accountName, mockAccount2.accountName]
            },
        });
        expect(mockedUpdateHa).toHaveBeenCalledTimes(1);
    });

    test("will remove player from existing activity when another player is still active on the console", async () => {
        //#region MOCKS
        const mockActivity: PsnAccount.AccountActivity = {
            launchPlatform: 'PS5',
            platform: 'PS5',
            titleId: "Game 1",
            titleImage: "http://somegameurl.net/path-to-game1-image",
            titleName: "GAME1ID",
        }

        const mockAccount: PsnAccount = {
            accountId: "mock-account-id-1",
            accountName: "TestUser1",
            authInfo: {
                accessToken: "",
                accessTokenExpiration: 0,
                refreshToken: "",
                refreshTokenExpiration: 0
            },
            npsso: "----",
        };

        const mockDevice: Device = {
            address: { address: "192.168.0.10", port: 80 },
            available: true,
            id: "mock-id-1",
            name: "mock-ps5-1",
            normalizedName: "mock_ps5_1",
            status: 'AWAKE',
            systemVersion: "",
            transitioning: false,
            type: 'PS5',
            activity: {
                ...mockActivity,
                activePlayers: [mockAccount.accountName, "other_user"]
            },
        }
        //#endregion MOCKS

        const dispatched = [];
        await runSaga({
            dispatch: (action) => {
                return dispatched.push(action)
            },
            getState: () => (<Partial<State>>{
                devices: {
                    [mockDevice.id]: mockDevice
                }
            }),
        }, updateAccount, {
            payload: mockAccount,
            type: 'UPDATE_PSN_ACCOUNT'
        }).toPromise();

        const mockedUpdateHa = jest.requireMock("../action-creators").updateHomeAssistant;

        expect(mockedUpdateHa).toHaveBeenCalledWith(<Device>{
            address: { address: "192.168.0.10", port: 80 },
            available: true,
            id: "mock-id-1",
            name: "mock-ps5-1",
            normalizedName: "mock_ps5_1",
            status: 'AWAKE',
            systemVersion: "",
            transitioning: false,
            type: 'PS5',
            activity: {
                ...mockActivity,
                activePlayers: ["other_user"]
            },
        });
        expect(mockedUpdateHa).toHaveBeenCalledTimes(1);
    });

    test("will remove activity from device when no players are active on the console", async () => {
        //#region MOCKS
        const mockActivity: PsnAccount.AccountActivity = {
            launchPlatform: 'PS5',
            platform: 'PS5',
            titleId: "Game 1",
            titleImage: "http://somegameurl.net/path-to-game1-image",
            titleName: "GAME1ID",
        }

        const mockAccount: PsnAccount = {
            accountId: "mock-account-id-1",
            accountName: "TestUser1",
            authInfo: {
                accessToken: "",
                accessTokenExpiration: 0,
                refreshToken: "",
                refreshTokenExpiration: 0
            },
            npsso: "----",
        };

        const mockDevice: Device = {
            address: { address: "192.168.0.10", port: 80 },
            available: true,
            id: "mock-id-1",
            name: "mock-ps5-1",
            normalizedName: "mock_ps5_1",
            status: 'AWAKE',
            systemVersion: "",
            transitioning: false,
            type: 'PS5',
            activity: {
                ...mockActivity,
                activePlayers: [mockAccount.accountName]
            },
        }
        //#endregion MOCKS

        const dispatched = [];
        await runSaga({
            dispatch: (action) => {
                return dispatched.push(action)
            },
            getState: () => (<Partial<State>>{
                devices: {
                    [mockDevice.id]: mockDevice
                }
            }),
        }, updateAccount, {
            payload: mockAccount,
            type: 'UPDATE_PSN_ACCOUNT'
        }).toPromise();

        const mockedUpdateHa = jest.requireMock("../action-creators").updateHomeAssistant;

        expect(mockedUpdateHa).toHaveBeenCalledWith(<Device>{
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
        });
        expect(mockedUpdateHa).toHaveBeenCalledTimes(1);
    });
});
