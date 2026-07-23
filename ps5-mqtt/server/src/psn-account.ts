import * as psnApi from "psn-api"
import createDebugger from "debug"
import { createErrorLogger } from "./util/error-logger"
import { PsnAuthStore } from "./psn-auth-store"
import { persistProvisionalPsnTokens } from "./redux/action-creators"
import type { Dispatch } from "./redux/types"

const debug = createDebugger("@ha:ps5:psn-api")
const logError = createErrorLogger()

export namespace PsnAccount {
  export interface AccountActivity {
    titleId: string
    titleImage: string
    titleName: string

    /**
     * Type of device the title was created for.
     *
     * @type {NormalizedDeviceType}
     */
    platform: NormalizedDeviceType

    /**
     * Type of device the title is being used on.
     *
     * @type {NormalizedDeviceType}
     */
    launchPlatform: NormalizedDeviceType
  }

  /**
   * Bootstraps a PSN account on app startup. Prefers previously persisted
   * OAuth tokens for this NPSSO (refreshing them if needed) so a still-valid
   * refresh token chain survives add-on restarts. Only falls back to a full
   * NPSSO exchange when there are no usable persisted tokens.
   *
   * This module never touches disk itself: it only computes account/token
   * state and (for the narrow pre-accountId bootstrap window, see getAccount)
   * dispatches it. The persist-psn-account saga is the only thing that
   * mirrors that state to psn-auth.json.
   */
  export async function exchangeNpssoForPsnAccount(
    npsso: string,
    username: string | undefined,
    dispatch: Dispatch,
  ): Promise<PsnAccount> {
    const stored = await PsnAuthStore.findByNpsso(npsso)

    if (stored !== undefined) {
      try {
        return await getAccountFromStoredAuthInfo(stored, npsso, username)
      } catch (e) {
        debug(
          `Persisted PSN tokens for '${username ?? stored.accountName ?? "unknown"}' could not be used, falling back to NPSSO.`,
        )
        logError(e)
      }
    }

    try {
      return await getAccount(npsso, username, dispatch)
    } catch (e) {
      logError(
        `Unable to authenticate with PSN for account '${username ?? "unknown"}'. ` +
          (stored !== undefined
            ? "Both the persisted PSN tokens and the configured NPSSO have expired. "
            : "The configured NPSSO has expired. ") +
          "Generate a new NPSSO token (https://ca.account.sony.com/api/v1/ssocookie) and update your configuration.",
      )
      throw e
    }
  }

  export async function updateAccount(
    account: PsnAccount,
  ): Promise<PsnAccount> {
    const authInfo = await getRefreshedAccountAuthInfo(account)

    const refreshedAccount: PsnAccount = {
      ...account,
      authInfo,
    }

    return {
      ...refreshedAccount,
      activity: await getAccountActivity(refreshedAccount),
    }
  }
}

export interface PsnAccount {
  accountName: string
  accountId: string

  npsso: string
  authInfo: PsnAccountAuthenticationInfo
  activity?: PsnAccount.AccountActivity
}

type NormalizedDeviceType = "PS4" | "PS5"

export interface PsnAccountAuthenticationInfo {
  refreshToken: string
  refreshTokenExpiration: number

  accessToken: string
  accessTokenExpiration: number
}

interface BasicPresenceResponse {
  basicPresence: {
    availability: "unavailable" | "availableToPlay"
    lastAvailableDate: string
    primaryPlatformInfo: {
      onlineStatus: "offline"
      platform: "ps4" | "PS5"
      lastOnlineDate: string
    }
    lastOnlineDate: string
    onlineStatus: "offline" | "online"
    platform: "ps4" | "PS5"
    gameTitleInfoList: {
      format: "ps4" | "PS5"
      launchPlatform: "ps4" | "PS5"
      npTitleIconUrl: string
      conceptIconUrl: string
      npTitleId: string
      titleName: string
    }[]
  }
}

async function getAccount(
  npsso: string,
  username: string | undefined,
  dispatch: Dispatch,
): Promise<PsnAccount> {
  const accessCode = await psnApi.exchangeNpssoForCode(npsso)

  const authorization = await psnApi.exchangeCodeForAccessToken(accessCode)
  const authInfo = convertAuthResponseToAuthInfo(authorization)

  // accountId isn't known yet, so the persist saga will store this under the
  // NPSSO's hash; this way a profile-fetch failure below doesn't strand the
  // freshly obtained tokens unpersisted.
  dispatch(persistProvisionalPsnTokens(npsso, authInfo, username))

  const { profile } = await psnApi.getProfileFromUserName(authorization, "me")

  const account: PsnAccount = {
    accountName: username ?? profile.onlineId,
    accountId: profile.accountId,
    npsso,
    authInfo,
  }

  return {
    ...account,
    activity: await getAccountActivity(account),
  }
}

async function getAccountFromStoredAuthInfo(
  stored: PsnAuthStore.StoredAccountAuthInfo,
  npsso: string,
  username?: string,
): Promise<PsnAccount> {
  if (Date.now() >= stored.authInfo.refreshTokenExpiration) {
    throw new Error("Persisted PSN refresh token has expired.")
  }

  const authResponse = await psnApi.exchangeRefreshTokenForAuthTokens(
    stored.authInfo.refreshToken,
  )
  const authInfo = convertAuthResponseToAuthInfo(authResponse)

  const { profile } = await psnApi.getProfileFromUserName(
    { accessToken: authInfo.accessToken },
    "me",
  )

  const account: PsnAccount = {
    accountName: username ?? stored.accountName ?? profile.onlineId,
    accountId: profile.accountId,
    npsso,
    authInfo,
  }

  return {
    ...account,
    activity: await getAccountActivity(account),
  }
}

async function getAccountActivity({
  accountId,
  authInfo,
}: PsnAccount): Promise<PsnAccount.AccountActivity | undefined> {
  try {
    const response = await fetch(
      `https://m.np.playstation.com/api/` +
        `userProfile/v1/internal/users/${accountId}/basicPresences?type=primary`,
      {
        method: "GET",
        headers: {
          Authorization: "Bearer " + authInfo.accessToken,
        },
      },
    )

    if (response.status >= 400 && response.status < 600) {
      debug(
        `Unable to retrieve PSN information. API response: "${response.status}:${response.statusText}"`,
      )
    } else {
      const { basicPresence } = (await response.json()) as BasicPresenceResponse

      if (basicPresence?.gameTitleInfoList?.length > 0) {
        const [activeTitle] = basicPresence.gameTitleInfoList

        return {
          titleId: activeTitle.npTitleId,
          titleImage: activeTitle.npTitleIconUrl ?? activeTitle.conceptIconUrl,
          titleName: activeTitle.titleName,
          platform: activeTitle.format.toUpperCase() as NormalizedDeviceType,
          launchPlatform:
            activeTitle.launchPlatform.toUpperCase() as NormalizedDeviceType,
        }
      }
    }
  } catch (e) {
    logError(e)
  }

  return undefined
}

async function getRefreshedAccountAuthInfo({
  authInfo,
  npsso,
}: PsnAccount): Promise<PsnAccountAuthenticationInfo> {
  if (Date.now() < authInfo.accessTokenExpiration) {
    return authInfo
  }

  if (Date.now() < authInfo.refreshTokenExpiration) {
    const authResponse = await psnApi.exchangeRefreshTokenForAuthTokens(
      authInfo.refreshToken,
    )
    return convertAuthResponseToAuthInfo(authResponse)
  }

  const accessCode = await psnApi.exchangeNpssoForCode(npsso)
  const authResponse = await psnApi.exchangeCodeForAccessToken(accessCode)
  return convertAuthResponseToAuthInfo(authResponse)
}

function convertAuthResponseToAuthInfo(
  authResponse: psnApi.AuthTokensResponse,
): PsnAccountAuthenticationInfo {
  return {
    accessToken: authResponse.accessToken,
    refreshToken: authResponse.refreshToken,
    accessTokenExpiration: getExpirationDateValue(authResponse.expiresIn),
    refreshTokenExpiration: getExpirationDateValue(
      authResponse.refreshTokenExpiresIn,
    ),
  }
}

function getExpirationDateValue(expirationOffset: number): number {
  const now = new Date()
  now.setSeconds(now.getSeconds() + expirationOffset)
  return now.valueOf()
}
