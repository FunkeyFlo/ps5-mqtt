import * as psnApi from 'psn-api';
import { createErrorLogger } from './util/error-logger';
import {AuthorizationPayload, BasicPresenceResponse} from "psn-api";

const logError = createErrorLogger()

export namespace PsnAccount {
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

export type NormalizedDeviceType = 'PS4' | 'PS5';

interface PsnAccountAuthenticationInfo {
    refreshToken: string;
    refreshTokenExpiration: number;

    accessToken: AuthorizationPayload;
    accessTokenExpiration: number;
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

export async function getAccountActivity({accountId, authInfo}: PsnAccount): Promise<PsnAccount.AccountActivity | undefined> {
    try {
        const {basicPresence}: BasicPresenceResponse = await psnApi.getBasicPresence(authInfo.accessToken, accountId)

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
        accessToken: { accessToken: authResponse.accessToken},
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