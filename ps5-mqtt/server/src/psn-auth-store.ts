import { createHash } from "crypto"
import * as fs from "fs"
import * as os from "os"
import * as path from "path"
import createDebugger from "debug"

import { createErrorLogger } from "./util/error-logger"
import type { PsnAccountAuthenticationInfo } from "./psn-account"

const debug = createDebugger("@ha:ps5:psn-auth-store")
const logError = createErrorLogger()

const STORE_FILE_NAME = "psn-auth.json"
const STORE_VERSION = 1

export namespace PsnAuthStore {
  export interface StoredAccountAuthInfo {
    // hash of the NPSSO token used the last time this account was
    // (re)authenticated from scratch; used to detect when the user has
    // rotated the NPSSO in their configuration, which invalidates the
    // persisted tokens for that account.
    npssoHash: string
    accountId?: string
    accountName?: string
    authInfo: PsnAccountAuthenticationInfo
    updatedAt: string
  }

  export function hashNpsso(npsso: string): string {
    return createHash("sha256").update(npsso).digest("hex")
  }

  export function resolveKey(
    accountId: string | undefined,
    npsso: string,
  ): string {
    return accountId ? accountId : hashNpsso(npsso)
  }

  export function getStoreDir(): string {
    const envDir = process.env.PSN_AUTH_STORE_DIR
    if (envDir) {
      return envDir
    }

    // /data is always mounted for Home Assistant add-ons and survives
    // add-on restarts/updates, regardless of the add-on's `map` config.
    if (isWritableDirectory("/data")) {
      return "/data"
    }

    return path.join(os.homedir(), ".config", "ps5-mqtt")
  }

  export function findByNpsso(
    npsso: string,
  ): StoredAccountAuthInfo | undefined {
    const npssoHash = hashNpsso(npsso)
    return Object.values(readStore().accounts).find(
      (entry) => entry.npssoHash === npssoHash,
    )
  }

  export function findByAccountId(
    accountId: string,
  ): StoredAccountAuthInfo | undefined {
    return readStore().accounts[accountId]
  }

  export function save(
    key: string,
    entry: Omit<StoredAccountAuthInfo, "updatedAt">,
    previousKey?: string,
  ): void {
    const store = readStore()

    if (previousKey && previousKey !== key) {
      delete store.accounts[previousKey]
    }

    store.accounts[key] = { ...entry, updatedAt: new Date().toISOString() }

    writeStore(store)
  }

  export function remove(key: string): void {
    const store = readStore()
    if (key in store.accounts) {
      delete store.accounts[key]
      writeStore(store)
    }
  }
}

interface StoreFile {
  version: number
  accounts: Record<string, PsnAuthStore.StoredAccountAuthInfo>
}

function getStoreFilePath(): string {
  return path.join(PsnAuthStore.getStoreDir(), STORE_FILE_NAME)
}

function isWritableDirectory(dir: string): boolean {
  try {
    fs.accessSync(dir, fs.constants.W_OK)
    return true
  } catch {
    return false
  }
}

function readStore(): StoreFile {
  const filePath = getStoreFilePath()

  try {
    if (!fs.existsSync(filePath)) {
      return { version: STORE_VERSION, accounts: {} }
    }

    const raw = fs.readFileSync(filePath, { encoding: "utf-8" })
    const parsed = JSON.parse(raw)

    return {
      version: parsed.version ?? STORE_VERSION,
      accounts: parsed.accounts ?? {},
    }
  } catch (e) {
    logError(`Unable to read PSN auth store at '${filePath}'.`, e)
    return { version: STORE_VERSION, accounts: {} }
  }
}

function writeStore(store: StoreFile): void {
  const filePath = getStoreFilePath()
  const dir = path.dirname(filePath)

  try {
    fs.mkdirSync(dir, { recursive: true, mode: 0o700 })

    const tmpPath = `${filePath}.${process.pid}.tmp`
    fs.writeFileSync(tmpPath, JSON.stringify(store, null, 2), {
      encoding: "utf-8",
      mode: 0o600,
    })
    fs.renameSync(tmpPath, filePath)
    fs.chmodSync(filePath, 0o600)

    debug(`Persisted PSN auth store to '${filePath}'.`)
  } catch (e) {
    logError(`Unable to persist PSN auth store to '${filePath}'.`, e)
  }
}
