import * as psnApi from "psn-api"

import { PsnAccount } from "../psn-account"
import { PsnAuthStore } from "../psn-auth-store"

jest.mock("psn-api")
jest.mock("../psn-auth-store")

const mockedExchangeNpssoForCode = jest.mocked(psnApi.exchangeNpssoForCode)
const mockedExchangeCodeForAccessToken = jest.mocked(
  psnApi.exchangeCodeForAccessToken,
)
const mockedExchangeRefreshTokenForAuthTokens = jest.mocked(
  psnApi.exchangeRefreshTokenForAuthTokens,
)
const mockedGetProfileFromUserName = jest.mocked(psnApi.getProfileFromUserName)

const mockedFindByNpsso = jest.mocked(PsnAuthStore.findByNpsso)

const npsso = "npsso-value"

const authTokensResponse: psnApi.AuthTokensResponse = {
  accessToken: "fresh-access-token",
  expiresIn: 3600,
  idToken: "id-token",
  refreshToken: "fresh-refresh-token",
  refreshTokenExpiresIn: 60 * 60 * 24 * 60,
  scope: "scope",
  tokenType: "bearer",
}

describe("PsnAccount", () => {
  const dispatch = jest.fn()

  beforeEach(() => {
    jest.clearAllMocks()

    global.fetch = jest.fn().mockResolvedValue({
      status: 404,
      statusText: "Not Found",
    }) as unknown as typeof fetch

    mockedExchangeNpssoForCode.mockResolvedValue("access-code")
    mockedExchangeCodeForAccessToken.mockResolvedValue(authTokensResponse)
    mockedExchangeRefreshTokenForAuthTokens.mockResolvedValue(
      authTokensResponse,
    )
    mockedGetProfileFromUserName.mockResolvedValue({
      profile: { onlineId: "MyPsnUser", accountId: "account-1" },
    } as Awaited<ReturnType<typeof psnApi.getProfileFromUserName>>)
  })

  describe("exchangeNpssoForPsnAccount", () => {
    test("performs the full NPSSO exchange when there are no persisted tokens", async () => {
      mockedFindByNpsso.mockResolvedValue(undefined)

      const account = await PsnAccount.exchangeNpssoForPsnAccount(
        npsso,
        undefined,
        dispatch,
      )

      expect(mockedExchangeNpssoForCode).toHaveBeenCalledWith(npsso)
      expect(mockedExchangeRefreshTokenForAuthTokens).not.toHaveBeenCalled()
      expect(account.accountId).toBe("account-1")
      expect(account.accountName).toBe("MyPsnUser")
      expect(account.authInfo.accessToken).toBe("fresh-access-token")

      // dispatched once, provisionally, before accountId is known (in case
      // the profile fetch that follows fails); the caller is responsible
      // for dispatching UPDATE_PSN_ACCOUNT once this resolves
      expect(dispatch).toHaveBeenCalledTimes(1)
      expect(dispatch).toHaveBeenCalledWith(
        expect.objectContaining({
          type: "PERSIST_PROVISIONAL_PSN_TOKENS",
          payload: expect.objectContaining({
            npsso,
            authInfo: expect.objectContaining({
              accessToken: "fresh-access-token",
            }),
          }),
        }),
      )
    })

    test("prefers a persisted, still-valid refresh token over the NPSSO", async () => {
      mockedFindByNpsso.mockResolvedValue({
        npssoHash: "hash(npsso-value)",
        accountId: "account-1",
        accountName: "MyPsnUser",
        authInfo: {
          accessToken: "stale-access-token",
          accessTokenExpiration: Date.now() - 1000,
          refreshToken: "stored-refresh-token",
          refreshTokenExpiration: Date.now() + 1000 * 60 * 60 * 24 * 30,
        },
        updatedAt: "2024-01-01",
      })

      const account = await PsnAccount.exchangeNpssoForPsnAccount(
        npsso,
        undefined,
        dispatch,
      )

      expect(mockedExchangeNpssoForCode).not.toHaveBeenCalled()
      expect(mockedExchangeRefreshTokenForAuthTokens).toHaveBeenCalledWith(
        "stored-refresh-token",
      )
      expect(mockedGetProfileFromUserName).toHaveBeenCalledWith(
        { accessToken: "fresh-access-token" },
        "me",
      )
      expect(account.accountId).toBe("account-1")
      // the stored-token path never lacks an accountId, so there's nothing
      // provisional to dispatch here — the caller dispatches UPDATE_PSN_ACCOUNT
      expect(dispatch).not.toHaveBeenCalled()
    })

    test("falls back to the NPSSO when the persisted refresh token has expired", async () => {
      mockedFindByNpsso.mockResolvedValue({
        npssoHash: "hash(npsso-value)",
        accountId: "account-1",
        authInfo: {
          accessToken: "stale-access-token",
          accessTokenExpiration: Date.now() - 1000,
          refreshToken: "stored-refresh-token",
          refreshTokenExpiration: Date.now() - 1000,
        },
        updatedAt: "2024-01-01",
      })

      const account = await PsnAccount.exchangeNpssoForPsnAccount(
        npsso,
        undefined,
        dispatch,
      )

      expect(mockedExchangeRefreshTokenForAuthTokens).not.toHaveBeenCalled()
      expect(mockedExchangeNpssoForCode).toHaveBeenCalledWith(npsso)
      expect(account.accountId).toBe("account-1")
    })

    test("throws when both the persisted tokens and the NPSSO have expired", async () => {
      mockedFindByNpsso.mockResolvedValue({
        npssoHash: "hash(npsso-value)",
        accountId: "account-1",
        authInfo: {
          accessToken: "stale-access-token",
          accessTokenExpiration: Date.now() - 1000,
          refreshToken: "stored-refresh-token",
          refreshTokenExpiration: Date.now() - 1000,
        },
        updatedAt: "2024-01-01",
      })
      mockedExchangeNpssoForCode.mockRejectedValue(new Error("NPSSO expired"))

      await expect(
        PsnAccount.exchangeNpssoForPsnAccount(npsso, undefined, dispatch),
      ).rejects.toThrow("NPSSO expired")
    })
  })

  describe("updateAccount", () => {
    const baseAccount: PsnAccount = {
      accountId: "account-1",
      accountName: "MyPsnUser",
      npsso,
      authInfo: {
        accessToken: "current-access-token",
        accessTokenExpiration: Date.now() + 1000 * 60 * 60,
        refreshToken: "current-refresh-token",
        refreshTokenExpiration: Date.now() + 1000 * 60 * 60 * 24 * 30,
      },
    }

    test("does not refresh when the access token is still valid", async () => {
      const account = await PsnAccount.updateAccount(baseAccount)

      expect(mockedExchangeRefreshTokenForAuthTokens).not.toHaveBeenCalled()
      expect(account.authInfo).toEqual(baseAccount.authInfo)
    })

    test("refreshes when the access token has expired", async () => {
      const expiredAccount: PsnAccount = {
        ...baseAccount,
        authInfo: {
          ...baseAccount.authInfo,
          accessTokenExpiration: Date.now() - 1000,
        },
      }

      const account = await PsnAccount.updateAccount(expiredAccount)

      expect(mockedExchangeRefreshTokenForAuthTokens).toHaveBeenCalledWith(
        "current-refresh-token",
      )
      expect(account.authInfo.accessToken).toBe("fresh-access-token")
    })

    describe("account presence", () => {
      const mockPresenceResponse = (body: unknown, status = 200) => {
        global.fetch = jest.fn().mockResolvedValue({
          status,
          statusText: "",
          json: async () => body,
        }) as unknown as typeof fetch
      }

      test("reports an online account with its platform and last-online date", async () => {
        mockPresenceResponse({
          basicPresence: {
            availability: "availableToPlay",
            primaryPlatformInfo: {
              onlineStatus: "online",
              platform: "PS5",
              lastOnlineDate: "2024-05-01T10:00:00.000Z",
            },
          },
        })

        const account = await PsnAccount.updateAccount(baseAccount)

        expect(account.presenceAvailable).toBe(true)
        expect(account.presence).toMatchObject({
          online: true,
          platform: "PS5",
          lastOnline: "2024-05-01T10:00:00.000Z",
        })
      })

      test("reports an offline account as offline (not unavailable)", async () => {
        mockPresenceResponse({
          basicPresence: {
            availability: "unavailable",
            primaryPlatformInfo: {
              onlineStatus: "offline",
              platform: "ps4",
              lastOnlineDate: "2024-05-01T10:00:00.000Z",
            },
          },
        })

        const account = await PsnAccount.updateAccount(baseAccount)

        expect(account.presenceAvailable).toBe(true)
        expect(account.presence).toMatchObject({
          online: false,
          platform: "PS4",
        })
      })

      test("follows an online -> offline transition across polls", async () => {
        mockPresenceResponse({
          basicPresence: {
            primaryPlatformInfo: { onlineStatus: "online", platform: "PS5" },
          },
        })
        const online = await PsnAccount.updateAccount(baseAccount)

        mockPresenceResponse({
          basicPresence: {
            primaryPlatformInfo: { onlineStatus: "offline", platform: "PS5" },
          },
        })
        const offline = await PsnAccount.updateAccount(online)

        expect(online.presence?.online).toBe(true)
        expect(offline.presence?.online).toBe(false)
        expect(offline.presenceAvailable).toBe(true)
      })

      test("falls back to the top-level presence fields", async () => {
        mockPresenceResponse({
          basicPresence: {
            onlineStatus: "online",
            platform: "PS5",
            lastOnlineDate: "2024-05-01T10:00:00.000Z",
          },
        })

        const account = await PsnAccount.updateAccount(baseAccount)

        expect(account.presence).toMatchObject({
          online: true,
          platform: "PS5",
          lastOnline: "2024-05-01T10:00:00.000Z",
        })
      })

      test("tolerates absent platform and last-online fields", async () => {
        mockPresenceResponse({
          basicPresence: {
            primaryPlatformInfo: { onlineStatus: "offline" },
          },
        })

        const account = await PsnAccount.updateAccount(baseAccount)

        expect(account.presenceAvailable).toBe(true)
        expect(account.presence).toMatchObject({
          online: false,
          platform: null,
          lastOnline: null,
        })
      })

      test("ignores an unparseable last-online date", async () => {
        mockPresenceResponse({
          basicPresence: {
            primaryPlatformInfo: {
              onlineStatus: "offline",
              lastOnlineDate: "not a date",
            },
          },
        })

        const account = await PsnAccount.updateAccount(baseAccount)

        expect(account.presence?.lastOnline).toBeNull()
      })

      test.each([
        ["an HTTP error", { status: 500, body: {} }],
        ["a 403 (privacy restriction)", { status: 403, body: {} }],
        [
          "an error body without presence",
          { status: 200, body: { error: {} } },
        ],
        [
          "a presence without an online status",
          { status: 200, body: { basicPresence: {} } },
        ],
      ])(
        "marks presence unavailable, not offline, for %s",
        async (_, { status, body }) => {
          mockPresenceResponse(body, status)

          const account = await PsnAccount.updateAccount(baseAccount)

          expect(account.presenceAvailable).toBe(false)
          expect(account.presence).toBeUndefined()
        },
      )

      test("marks presence unavailable when the request itself fails", async () => {
        global.fetch = jest
          .fn()
          .mockRejectedValue(
            new Error("network down"),
          ) as unknown as typeof fetch

        const account = await PsnAccount.updateAccount(baseAccount)

        expect(account.presenceAvailable).toBe(false)
      })

      test("keeps the last known presence as stale data after a failed poll", async () => {
        mockPresenceResponse({
          basicPresence: {
            primaryPlatformInfo: { onlineStatus: "online", platform: "PS5" },
          },
        })
        const online = await PsnAccount.updateAccount(baseAccount)

        mockPresenceResponse({}, 503)
        const failed = await PsnAccount.updateAccount(online)

        expect(failed.presenceAvailable).toBe(false)
        expect(failed.presence).toEqual(online.presence)
      })

      test("still derives console activity from the same response", async () => {
        mockPresenceResponse({
          basicPresence: {
            primaryPlatformInfo: { onlineStatus: "online", platform: "PS5" },
            gameTitleInfoList: [
              {
                npTitleId: "PPSA01521_00",
                titleName: "Horizon",
                format: "PS5",
                launchPlatform: "PS5",
                conceptIconUrl: "https://example.test/icon.png",
              },
            ],
          },
        })

        const account = await PsnAccount.updateAccount(baseAccount)

        expect(account.activity).toMatchObject({
          titleId: "PPSA01521_00",
          launchPlatform: "PS5",
        })
      })

      test("keeps presence when a game title lacks format and launchPlatform", async () => {
        mockPresenceResponse({
          basicPresence: {
            primaryPlatformInfo: { onlineStatus: "online", platform: "PS5" },
            gameTitleInfoList: [
              { npTitleId: "PPSA01521_00", titleName: "Horizon" },
            ],
          },
        })

        const account = await PsnAccount.updateAccount(baseAccount)

        expect(account.presenceAvailable).toBe(true)
        expect(account.presence).toMatchObject({ online: true, platform: "PS5" })
      })
    })
  })
})
