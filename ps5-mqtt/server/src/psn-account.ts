import * as psnApi from 'psn-api';
import fetch from 'node-fetch';
import createDebugger from 'debug';
import { createErrorLogger } from './util/error-logger';

const debug = createDebugger('@ha:ps5:psn-api');
const logError = createErrorLogger()

export module PsnAccount {
    export interface AccountActivity {
        titleId: string;
        titleImage: string;
        titleName: string;

        /**
         * Type of device the title was created for.
         *
         * @type {NormalizedDeviceType}
         */
        platform: NormalizedDeviceType;

        /**
         * Type of device the title is being used on.
         *
         * @type {NormalizedDeviceType}
         */
        launchPlatform: NormalizedDeviceType;
    }

    export async function exchangeNpssoForPsnAccount(
        npsso: string,
        username?: string
    ): Promise<PsnAccount> {
        return getAccount(npsso, username);
    }

    export async function updateAccount(account: PsnAccount): Promise<PsnAccount> {
        const authInfo = await getRefreshedAccountAuthInfo(account);

        const refreshedAccount: PsnAccount = {
            ...account,
            authInfo
        }

        return {
            ...refreshedAccount,
            activity: await getAccountActivity(refreshedAccount)
        }
    }
}

export interface PsnAccount {
    accountName: string;
    accountId: string;

    npsso: string;
    authInfo: PsnAccountAuthenticationInfo;
    activity?: PsnAccount.AccountActivity;
}

type NormalizedDeviceType = 'PS4' | 'PS5';

interface PsnAccountAuthenticationInfo {
    refreshToken: string;
    refreshTokenExpiration: number;

    accessToken: string;
    accessTokenExpiration: number;
}

interface BasicPresenceResponse {
    basicPresence: {
        availability: 'unavailable' | 'availableToPlay';
        lastAvailableDate: string;
        primaryPlatformInfo: {
            onlineStatus: 'offline';
            platform: 'ps4' | 'PS5';
            lastOnlineDate: string;
        }
        lastOnlineDate: string
        onlineStatus: 'offline' | 'online';
        platform: 'ps4' | 'PS5';
        gameTitleInfoList: {
            format: 'ps4' | 'PS5';
            launchPlatform: 'ps4' | 'PS5';
            npTitleIconUrl: string;
            conceptIconUrl: string;
            npTitleId: string;
            titleName: string;
        }[]
    }
}

async function getAccount(npsso: string, username?: string): Promise<PsnAccount> {
    const accessCode = await psnApi.exchangeNpssoForCode(npsso);

    const authorization = await psnApi.exchangeCodeForAccessToken(accessCode);

    const { profile } = await psnApi.getProfileFromUserName(authorization, 'me');

    const account: PsnAccount = {
        accountName: username ?? profile.onlineId,
        accountId: profile.accountId,
        npsso,
        authInfo: convertAuthResponseToAuthInfo(authorization)
    }

    return {
        ...account,
        activity: await getAccountActivity(account)
    }
}

async function getAccountActivity({ accountId, authInfo }: PsnAccount): Promise<PsnAccount.AccountActivity | undefined> {
    try {
        const response = await fetch(
            `https://m.np.playstation.com/api/` +
            `userProfile/v1/internal/users/${accountId}/basicPresences?type=primary`,
            {
                method: 'GET',
                headers: {
                    'Authorization': 'Bearer ' + authInfo.accessToken,
                },
            }
        );

        if (response.status >= 400 && response.status < 600) {
            debug(`Unable to retrieve PSN information. API response: "${response.status}:${response.statusText}"`);
        } else {
            const { basicPresence }: BasicPresenceResponse = await response.json();

            if (basicPresence?.gameTitleInfoList?.length > 0) {
                const [activeTitle] = basicPresence.gameTitleInfoList;

                return {
                    titleId: activeTitle.npTitleId,
                    titleImage: activeTitle.npTitleIconUrl ?? activeTitle.conceptIconUrl,
                    titleName: activeTitle.titleName,
                    platform: activeTitle.format.toUpperCase() as NormalizedDeviceType,
                    launchPlatform: activeTitle.launchPlatform.toUpperCase() as NormalizedDeviceType,
                }
            }
        }
    } catch (e) {
        logError(e);
    }

    return undefined;
}

async function getRefreshedAccountAuthInfo({ authInfo, npsso }: PsnAccount): Promise<PsnAccountAuthenticationInfo> {
    if (Date.now() < authInfo.accessTokenExpiration) {
        return authInfo;
    }
    else if (Date.now() < authInfo.refreshTokenExpiration) {
        const authResponse = await psnApi.exchangeRefreshTokenForAuthTokens(authInfo.refreshToken);
        return convertAuthResponseToAuthInfo(authResponse);
    } else {
        const accessCode = await psnApi.exchangeNpssoForCode(npsso);
        const authResponse = await psnApi.exchangeCodeForAccessToken(accessCode);
        return convertAuthResponseToAuthInfo(authResponse)
    }
}

function convertAuthResponseToAuthInfo(
    authResponse: psnApi.AuthTokensResponse
): PsnAccountAuthenticationInfo {
    return {
        accessToken: authResponse.accessToken,
        refreshToken: authResponse.refreshToken,
        accessTokenExpiration: getExpirationDateValue(authResponse.expiresIn),
        refreshTokenExpiration: getExpirationDateValue(authResponse.refreshTokenExpiresIn),
    }
}

function getExpirationDateValue(expirationOffset: number): number {
    const now = new Date();
    now.setSeconds(now.getSeconds() + expirationOffset);
    return now.valueOf();
}