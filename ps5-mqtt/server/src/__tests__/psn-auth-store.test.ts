import fs from "fs"
import os from "os"
import path from "path"

import type { PsnAccountAuthenticationInfo } from "../psn-account"
import { PsnAuthStore } from "../psn-auth-store"

jest.mock("fs")

const mockedExistsSync = (fs as jest.Mocked<typeof fs>).existsSync
const mockedReadFileSync = (fs as jest.Mocked<typeof fs>).readFileSync
const mockedWriteFileSync = (fs as jest.Mocked<typeof fs>).writeFileSync
const mockedRenameSync = (fs as jest.Mocked<typeof fs>).renameSync
const mockedMkdirSync = (fs as jest.Mocked<typeof fs>).mkdirSync
const mockedChmodSync = (fs as jest.Mocked<typeof fs>).chmodSync
const mockedAccessSync = (fs as jest.Mocked<typeof fs>).accessSync

const authInfo: PsnAccountAuthenticationInfo = {
  accessToken: "access-token-value",
  accessTokenExpiration: Date.now() + 1000 * 60 * 60,
  refreshToken: "refresh-token-value",
  refreshTokenExpiration: Date.now() + 1000 * 60 * 60 * 24 * 60,
}

describe("PsnAuthStore", () => {
  const originalEnv = process.env.PSN_AUTH_STORE_DIR

  beforeEach(() => {
    jest.clearAllMocks()
    process.env.PSN_AUTH_STORE_DIR = "/store"
    mockedAccessSync.mockImplementation(() => undefined)
    mockedExistsSync.mockReturnValue(false)
  })

  afterAll(() => {
    if (originalEnv === undefined) {
      delete process.env.PSN_AUTH_STORE_DIR
    } else {
      process.env.PSN_AUTH_STORE_DIR = originalEnv
    }
  })

  describe("hashNpsso", () => {
    test("produces a stable sha256 hex digest", () => {
      expect(PsnAuthStore.hashNpsso("npsso-value")).toBe(
        PsnAuthStore.hashNpsso("npsso-value"),
      )
      expect(PsnAuthStore.hashNpsso("npsso-value")).toMatch(/^[0-9a-f]{64}$/)
    })

    test("differs for different NPSSO tokens", () => {
      expect(PsnAuthStore.hashNpsso("a")).not.toBe(PsnAuthStore.hashNpsso("b"))
    })
  })

  describe("resolveKey", () => {
    test("uses accountId when provided", () => {
      expect(PsnAuthStore.resolveKey("account-1", "npsso-value")).toBe(
        "account-1",
      )
    })

    test("falls back to the NPSSO hash when accountId is missing", () => {
      expect(PsnAuthStore.resolveKey(undefined, "npsso-value")).toBe(
        PsnAuthStore.hashNpsso("npsso-value"),
      )
    })
  })

  describe("getStoreDir", () => {
    test("uses PSN_AUTH_STORE_DIR when set", () => {
      process.env.PSN_AUTH_STORE_DIR = "/custom-dir"
      expect(PsnAuthStore.getStoreDir()).toBe("/custom-dir")
    })

    test("falls back to /data when writable and no env var is set", () => {
      delete process.env.PSN_AUTH_STORE_DIR
      mockedAccessSync.mockImplementation(() => undefined)

      expect(PsnAuthStore.getStoreDir()).toBe("/data")
    })

    test("falls back to the user's config directory when /data isn't writable", () => {
      delete process.env.PSN_AUTH_STORE_DIR
      mockedAccessSync.mockImplementation(() => {
        throw new Error("EACCES: permission denied")
      })

      expect(PsnAuthStore.getStoreDir()).toBe(
        path.join(os.homedir(), ".config", "ps5-mqtt"),
      )
    })
  })

  describe("findByNpsso", () => {
    test("returns undefined when the store file doesn't exist", () => {
      mockedExistsSync.mockReturnValue(false)

      expect(PsnAuthStore.findByNpsso("npsso-value")).toBeUndefined()
    })

    test("returns the entry whose NPSSO hash matches", () => {
      const npssoHash = PsnAuthStore.hashNpsso("npsso-value")
      mockedExistsSync.mockReturnValue(true)
      mockedReadFileSync.mockReturnValue(
        JSON.stringify({
          version: 1,
          accounts: {
            "account-1": {
              npssoHash,
              accountId: "account-1",
              accountName: "MyUser",
              authInfo,
              updatedAt: new Date().toISOString(),
            },
          },
        }),
      )

      const result = PsnAuthStore.findByNpsso("npsso-value")

      expect(result?.accountId).toBe("account-1")
      expect(result?.authInfo).toEqual(authInfo)
    })

    test("returns undefined when no entry matches the NPSSO hash (rotated NPSSO)", () => {
      mockedExistsSync.mockReturnValue(true)
      mockedReadFileSync.mockReturnValue(
        JSON.stringify({
          version: 1,
          accounts: {
            "account-1": {
              npssoHash: PsnAuthStore.hashNpsso("a-different-npsso"),
              accountId: "account-1",
              authInfo,
              updatedAt: new Date().toISOString(),
            },
          },
        }),
      )

      expect(PsnAuthStore.findByNpsso("npsso-value")).toBeUndefined()
    })

    test("returns undefined and does not throw on corrupt store contents", () => {
      mockedExistsSync.mockReturnValue(true)
      mockedReadFileSync.mockReturnValue("{ not valid json")

      expect(PsnAuthStore.findByNpsso("npsso-value")).toBeUndefined()
    })
  })

  describe("findByAccountId", () => {
    test("returns the entry stored under the given accountId", () => {
      mockedExistsSync.mockReturnValue(true)
      mockedReadFileSync.mockReturnValue(
        JSON.stringify({
          version: 1,
          accounts: {
            "account-1": {
              npssoHash: PsnAuthStore.hashNpsso("npsso-value"),
              accountId: "account-1",
              authInfo,
              updatedAt: new Date().toISOString(),
            },
          },
        }),
      )

      expect(PsnAuthStore.findByAccountId("account-1")?.accountId).toBe(
        "account-1",
      )
      expect(PsnAuthStore.findByAccountId("unknown")).toBeUndefined()
    })
  })

  describe("save", () => {
    test("writes atomically (tmp file + rename) with 0o600 permissions", () => {
      PsnAuthStore.save("account-1", {
        npssoHash: PsnAuthStore.hashNpsso("npsso-value"),
        accountId: "account-1",
        accountName: "MyUser",
        authInfo,
      })

      expect(mockedMkdirSync).toHaveBeenCalledWith(
        "/store",
        expect.objectContaining({ recursive: true }),
      )

      expect(mockedWriteFileSync).toHaveBeenCalledTimes(1)
      const [tmpPath, contents, options] = mockedWriteFileSync.mock.calls[0]
      expect(tmpPath).toMatch(/psn-auth\.json\..*\.tmp$/)
      expect(options).toEqual(expect.objectContaining({ mode: 0o600 }))

      expect(mockedRenameSync).toHaveBeenCalledWith(
        tmpPath,
        path.join("/store", "psn-auth.json"),
      )
      expect(mockedChmodSync).toHaveBeenCalledWith(
        path.join("/store", "psn-auth.json"),
        0o600,
      )

      const written = JSON.parse(contents as string)
      expect(written.accounts["account-1"].accountId).toBe("account-1")
      expect(written.accounts["account-1"].authInfo).toEqual(authInfo)
      expect(written.accounts["account-1"].updatedAt).toEqual(
        expect.any(String),
      )
    })

    test("migrates away from the previous key when the account key changes", () => {
      const npssoHash = PsnAuthStore.hashNpsso("npsso-value")
      mockedExistsSync.mockReturnValue(true)
      mockedReadFileSync.mockReturnValue(
        JSON.stringify({
          version: 1,
          accounts: {
            [npssoHash]: { npssoHash, authInfo, updatedAt: "2024-01-01" },
          },
        }),
      )

      PsnAuthStore.save(
        "account-1",
        { npssoHash, accountId: "account-1", authInfo },
        npssoHash,
      )

      const [, contents] = mockedWriteFileSync.mock.calls[0]
      const written = JSON.parse(contents as string)
      expect(written.accounts[npssoHash]).toBeUndefined()
      expect(written.accounts["account-1"]).toBeDefined()
    })
  })

  describe("remove", () => {
    test("deletes the entry for the given key", () => {
      mockedExistsSync.mockReturnValue(true)
      mockedReadFileSync.mockReturnValue(
        JSON.stringify({
          version: 1,
          accounts: {
            "account-1": {
              npssoHash: PsnAuthStore.hashNpsso("npsso-value"),
              accountId: "account-1",
              authInfo,
              updatedAt: "2024-01-01",
            },
          },
        }),
      )

      PsnAuthStore.remove("account-1")

      expect(mockedWriteFileSync).toHaveBeenCalledTimes(1)
      const [, contents] = mockedWriteFileSync.mock.calls[0]
      const written = JSON.parse(contents as string)
      expect(written.accounts["account-1"]).toBeUndefined()
    })

    test("is a no-op when the key isn't present", () => {
      mockedExistsSync.mockReturnValue(false)

      PsnAuthStore.remove("account-1")

      expect(mockedWriteFileSync).not.toHaveBeenCalled()
    })
  })
})
