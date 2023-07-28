import {rest} from "msw";
import {setupServer} from "msw/node";
import {AuthorizationPayload, BasicPresenceResponse} from "psn-api";
import {getAccountActivity, NormalizedDeviceType, PsnAccount} from "./psn-account";

const server = setupServer();
const USER_BASE_URL = "https://m.np.playstation.com/api/userProfile/v1/internal/users";

describe("Function: getBasicPresence", () => {
    // MSW Setup
    beforeAll(() => server.listen());
    afterEach(() => server.resetHandlers());
    afterAll(() => server.close());

    it("is defined #sanity", () => {
        // ASSERT
        expect(getAccountActivity).toBeDefined();
    });

    it("retrieves the basic presence for a given account id", async () => {
        // ARRANGE
        const mockAuthorization: AuthorizationPayload = {
            accessToken: "mockAccessToken"
        };

        const mockResponse: BasicPresenceResponse = {
            basicPresence: {
                availability: "availableToPlay",

                primaryPlatformInfo: {
                    onlineStatus: "online",
                    platform: "PS5",
                    lastOnlineDate: "2023-06-03T21:25:28.987Z"
                },
                gameTitleInfoList: [
                    {
                        npTitleId: "PPSA01521_00",
                        titleName: "Horizon Forbidden West",
                        format: "PS5",
                        launchPlatform: "PS5",
                        conceptIconUrl:
                            "https://image.api.playstation.com/vulcan/ap/rnd/202010/2915/kifM3lnke5lExwRd96mIDojQ.png"
                    }
                ]
            }
        };

        server.use(
            rest.get(
                `${USER_BASE_URL}/111222333444/basicPresences`,
                (_, res, ctx) => {
                    const type = _.url.searchParams.get('type');

                    console.log("ADS: " + type);
                    if (type === 'primary') {
                        return res(ctx.json(mockResponse));
                    }
                    return null;
                }
            )
        );

        // ACT
        const account: PsnAccount = {
            accountName: "111222333444",
            accountId: "111222333444",
            npsso: null,
            authInfo: {
                accessToken: {accessToken: mockAuthorization.accessToken},
                refreshToken: null,
                accessTokenExpiration: null,
                refreshTokenExpiration: null
            }
        }
        const response = await getAccountActivity(account);

        let expectedGameInfo = mockResponse.basicPresence.gameTitleInfoList.at(0);
        const expectedResponse: PsnAccount.AccountActivity = {
            titleId: expectedGameInfo.npTitleId,
            titleImage: expectedGameInfo.npTitleIconUrl ?? expectedGameInfo.conceptIconUrl,
            titleName: expectedGameInfo.titleName,
            platform: expectedGameInfo.format.toUpperCase() as NormalizedDeviceType,
            launchPlatform: expectedGameInfo.launchPlatform.toUpperCase() as NormalizedDeviceType,
        }
        // ASSERT
        expect(response).toEqual(expectedResponse);
    });

    it("throws an error if we receive a response containing an `error` object", async () => {
        // ARRANGE
        const mockAuthorization: AuthorizationPayload = {
            accessToken: "mockAccessToken"
        };

        const mockResponse = {
            error: {code: 2_105_356, message: "User not found (user: 'xeln12ia')"}
        };

        server.use(
            rest.get(`${USER_BASE_URL}/111222333444/basicPresences`, (_, res, ctx) => {
                return res(ctx.json(mockResponse));
            })
        );
        const account: PsnAccount = {
            accountName: "111222333444",
            accountId: "111222333444",
            npsso: null,
            authInfo: {
                accessToken: {accessToken: mockAuthorization.accessToken},
                refreshToken: null,
                accessTokenExpiration: null,
                refreshTokenExpiration: null
            }
        }
        // ASSERT
        expect( await  getAccountActivity(account)).toEqual(undefined);
    });
});
