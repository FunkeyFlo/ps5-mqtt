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
const mockedResolveKey = jest.mocked(PsnAuthStore.resolveKey)
const mockedHashNpsso = jest.mocked(PsnAuthStore.hashNpsso)
const mockedSave = jest.mocked(PsnAuthStore.save)

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
  beforeEach(() => {
    jest.clearAllMocks()

    global.fetch = jest.fn().mockResolvedValue({
      status: 404,
      statusText: "Not Found",
    }) as unknown as typeof fetch

    mockedResolveKey.mockImplementation((accountId, rawNpsso) =>
      accountId ? accountId : `hash(${rawNpsso})`,
    )
    mockedHashNpsso.mockImplementation((rawNpsso) => `hash(${rawNpsso})`)

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
      mockedFindByNpsso.mockReturnValue(undefined)

      const account = await PsnAccount.exchangeNpssoForPsnAccount(npsso)

      expect(mockedExchangeNpssoForCode).toHaveBeenCalledWith(npsso)
      expect(mockedExchangeRefreshTokenForAuthTokens).not.toHaveBeenCalled()
      expect(account.accountId).toBe("account-1")
      expect(account.accountName).toBe("MyPsnUser")
      expect(account.authInfo.accessToken).toBe("fresh-access-token")

      // persisted once provisionally (keyed by NPSSO hash) and once more
      // after the accountId becomes known
      expect(mockedSave).toHaveBeenCalledTimes(2)
      expect(mockedSave).toHaveBeenLastCalledWith(
        "account-1",
        expect.objectContaining({ accountId: "account-1" }),
        expect.any(String),
      )
    })

    test("prefers a persisted, still-valid refresh token over the NPSSO", async () => {
      mockedFindByNpsso.mockReturnValue({
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

      const account = await PsnAccount.exchangeNpssoForPsnAccount(npsso)

      expect(mockedExchangeNpssoForCode).not.toHaveBeenCalled()
      expect(mockedExchangeRefreshTokenForAuthTokens).toHaveBeenCalledWith(
        "stored-refresh-token",
      )
      expect(mockedGetProfileFromUserName).toHaveBeenCalledWith(
        { accessToken: "fresh-access-token" },
        "me",
      )
      expect(account.accountId).toBe("account-1")
      expect(mockedSave).toHaveBeenCalledTimes(1)
    })

    test("falls back to the NPSSO when the persisted refresh token has expired", async () => {
      mockedFindByNpsso.mockReturnValue({
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

      const account = await PsnAccount.exchangeNpssoForPsnAccount(npsso)

      expect(mockedExchangeRefreshTokenForAuthTokens).not.toHaveBeenCalled()
      expect(mockedExchangeNpssoForCode).toHaveBeenCalledWith(npsso)
      expect(account.accountId).toBe("account-1")
    })

    test("throws when both the persisted tokens and the NPSSO have expired", async () => {
      mockedFindByNpsso.mockReturnValue({
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
        PsnAccount.exchangeNpssoForPsnAccount(npsso),
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

    test("does not refresh or persist when the access token is still valid", async () => {
      const account = await PsnAccount.updateAccount(baseAccount)

      expect(mockedExchangeRefreshTokenForAuthTokens).not.toHaveBeenCalled()
      expect(mockedSave).not.toHaveBeenCalled()
      expect(account.authInfo).toEqual(baseAccount.authInfo)
    })

    test("refreshes and persists when the access token has expired", async () => {
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
      expect(mockedSave).toHaveBeenCalledTimes(1)
      expect(mockedSave).toHaveBeenCalledWith(
        "account-1",
        expect.objectContaining({ accountId: "account-1" }),
        undefined,
      )
    })
  })
})
