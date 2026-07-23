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

  export async function getStoreDir(): Promise<string> {
    const envDir = process.env.PSN_AUTH_STORE_DIR
    if (envDir) {
      return envDir
    }

    // /data is always mounted for Home Assistant add-ons and survives
    // add-on restarts/updates, regardless of the add-on's `map` config.
    if (await isWritableDirectory("/data")) {
      return "/data"
    }

    return path.join(os.homedir(), ".config", "ps5-mqtt")
  }

  export async function findByNpsso(
    npsso: string,
  ): Promise<StoredAccountAuthInfo | undefined> {
    const npssoHash = hashNpsso(npsso)
    const store = await readStore()
    return Object.values(store.accounts).find(
      (entry) => entry.npssoHash === npssoHash,
    )
  }

  export async function findByAccountId(
    accountId: string,
  ): Promise<StoredAccountAuthInfo | undefined> {
    const store = await readStore()
    return store.accounts[accountId]
  }

  export async function save(
    key: string,
    entry: Omit<StoredAccountAuthInfo, "updatedAt">,
    previousKey?: string,
  ): Promise<void> {
    const store = await readStore()

    if (previousKey && previousKey !== key) {
      delete store.accounts[previousKey]
    }

    store.accounts[key] = { ...entry, updatedAt: new Date().toISOString() }

    await writeStore(store)
  }

  export async function remove(key: string): Promise<void> {
    const store = await readStore()
    if (key in store.accounts) {
      delete store.accounts[key]
      await writeStore(store)
    }
  }
}

interface StoreFile {
  version: number
  accounts: Record<string, PsnAuthStore.StoredAccountAuthInfo>
}

async function getStoreFilePath(): Promise<string> {
  return path.join(await PsnAuthStore.getStoreDir(), STORE_FILE_NAME)
}

async function isWritableDirectory(dir: string): Promise<boolean> {
  try {
    await fs.promises.access(dir, fs.constants.W_OK)
    return true
  } catch {
    return false
  }
}

async function readStore(): Promise<StoreFile> {
  const filePath = await getStoreFilePath()

  try {
    const raw = await fs.promises.readFile(filePath, { encoding: "utf-8" })
    const parsed = JSON.parse(raw)

    return {
      version: parsed.version ?? STORE_VERSION,
      accounts: parsed.accounts ?? {},
    }
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code === "ENOENT") {
      return { version: STORE_VERSION, accounts: {} }
    }

    logError(`Unable to read PSN auth store at '${filePath}'.`, e)
    return { version: STORE_VERSION, accounts: {} }
  }
}

async function writeStore(store: StoreFile): Promise<void> {
  const filePath = await getStoreFilePath()
  const dir = path.dirname(filePath)

  try {
    await fs.promises.mkdir(dir, { recursive: true, mode: 0o700 })

    const tmpPath = `${filePath}.${process.pid}.tmp`
    await fs.promises.writeFile(tmpPath, JSON.stringify(store, null, 2), {
      encoding: "utf-8",
      mode: 0o600,
    })
    await fs.promises.rename(tmpPath, filePath)
    await fs.promises.chmod(filePath, 0o600)

    debug(`Persisted PSN auth store to '${filePath}'.`)
  } catch (e) {
    logError(`Unable to persist PSN auth store to '${filePath}'.`, e)
  }
}
