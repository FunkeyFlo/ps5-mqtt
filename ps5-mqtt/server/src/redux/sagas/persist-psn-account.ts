import { call } from "redux-saga/effects"

import { PsnAuthStore } from "../../psn-auth-store"
import type {
  PersistProvisionalPsnTokensAction,
  UpdateAccountAction,
} from "../types"

// The single place PsnAuthStore.save() is called from. psn-account.ts's
// control flow only ever computes account/token state and dispatches it;
// this saga is what actually mirrors that state to disk, reacting to the
// same UPDATE_PSN_ACCOUNT action that already drives device/activity
// matching (see update-account.ts), plus PERSIST_PROVISIONAL_PSN_TOKENS for
// the narrow pre-accountId bootstrap window.
function* persistPsnAccount(
  action: UpdateAccountAction | PersistProvisionalPsnTokensAction,
) {
  const { npsso, authInfo, accountName } = action.payload
  const accountId =
    action.type === "UPDATE_PSN_ACCOUNT" ? action.payload.accountId : undefined

  // UPDATE_PSN_ACCOUNT fires on every presence-check tick (accountInterval,
  // default every 5s) whether or not the tokens actually changed, since it
  // also carries fresh activity data. Skip the write when nothing to persist
  // has changed, so this doesn't turn into a disk write every few seconds.
  const existing: PsnAuthStore.StoredAccountAuthInfo | undefined =
    accountId !== undefined
      ? yield call(PsnAuthStore.findByAccountId, accountId)
      : yield call(PsnAuthStore.findByNpsso, npsso)

  if (
    existing !== undefined &&
    existing.authInfo.accessToken === authInfo.accessToken &&
    existing.authInfo.refreshToken === authInfo.refreshToken
  ) {
    return
  }

  yield call(
    PsnAuthStore.save,
    PsnAuthStore.resolveKey(accountId, npsso),
    {
      npssoHash: PsnAuthStore.hashNpsso(npsso),
      accountId,
      accountName,
      authInfo,
    },
    // Once the accountId-keyed entry is known, drop the provisional
    // NPSSO-hash-keyed entry from the earlier PERSIST_PROVISIONAL_PSN_TOKENS
    // write, if any (a no-op if there wasn't one).
    accountId !== undefined ? PsnAuthStore.resolveKey(undefined, npsso) : undefined,
  )
}

export { persistPsnAccount }
