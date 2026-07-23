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
const mockedGetProfileFromUserName = jest.mocked(
  psnApi.getProfileFromUserName,
)

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
      mockedExchangeNpssoForCode.mockRejectedValue(
        new Error("NPSSO expired"),
      )

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
  })
})
