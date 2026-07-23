import fs from "fs"
import os from "os"
import path from "path"

import type { PsnAccountAuthenticationInfo } from "../psn-account"
import { PsnAuthStore } from "../psn-auth-store"

// fs.promises is a lazily-defined getter on the real "fs" module, which
// jest.mock("fs")'s automock doesn't populate (fs.promises ends up
// undefined). Preserve the rest of the real module (e.g. fs.constants) and
// only replace the promises API with mocks.
jest.mock("fs", () => ({
  ...jest.requireActual<typeof import("fs")>("fs"),
  promises: {
    readFile: jest.fn(),
    writeFile: jest.fn(),
    rename: jest.fn(),
    chmod: jest.fn(),
    mkdir: jest.fn(),
    access: jest.fn(),
  },
}))

const mockedReadFile = (fs.promises as jest.Mocked<typeof fs.promises>)
  .readFile
const mockedWriteFile = (fs.promises as jest.Mocked<typeof fs.promises>)
  .writeFile
const mockedRename = (fs.promises as jest.Mocked<typeof fs.promises>).rename
const mockedMkdir = (fs.promises as jest.Mocked<typeof fs.promises>).mkdir
const mockedChmod = (fs.promises as jest.Mocked<typeof fs.promises>).chmod
const mockedAccess = (fs.promises as jest.Mocked<typeof fs.promises>).access

function enoent(): NodeJS.ErrnoException {
  return Object.assign(new Error("ENOENT: no such file or directory"), {
    code: "ENOENT",
  })
}

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
    mockedAccess.mockResolvedValue(undefined)
    mockedReadFile.mockRejectedValue(enoent())
    mockedMkdir.mockResolvedValue(undefined)
    mockedWriteFile.mockResolvedValue(undefined)
    mockedRename.mockResolvedValue(undefined)
    mockedChmod.mockResolvedValue(undefined)
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
    test("uses PSN_AUTH_STORE_DIR when set", async () => {
      process.env.PSN_AUTH_STORE_DIR = "/custom-dir"
      await expect(PsnAuthStore.getStoreDir()).resolves.toBe("/custom-dir")
    })

    test("falls back to /data when writable and no env var is set", async () => {
      delete process.env.PSN_AUTH_STORE_DIR
      mockedAccess.mockResolvedValue(undefined)

      await expect(PsnAuthStore.getStoreDir()).resolves.toBe("/data")
    })

    test("falls back to the user's config directory when /data isn't writable", async () => {
      delete process.env.PSN_AUTH_STORE_DIR
      mockedAccess.mockRejectedValue(new Error("EACCES: permission denied"))

      await expect(PsnAuthStore.getStoreDir()).resolves.toBe(
        path.join(os.homedir(), ".config", "ps5-mqtt"),
      )
    })
  })

  describe("findByNpsso", () => {
    test("returns undefined when the store file doesn't exist", async () => {
      mockedReadFile.mockRejectedValue(enoent())

      await expect(
        PsnAuthStore.findByNpsso("npsso-value"),
      ).resolves.toBeUndefined()
    })

    test("returns the entry whose NPSSO hash matches", async () => {
      const npssoHash = PsnAuthStore.hashNpsso("npsso-value")
      mockedReadFile.mockResolvedValue(
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

      const result = await PsnAuthStore.findByNpsso("npsso-value")

      expect(result?.accountId).toBe("account-1")
      expect(result?.authInfo).toEqual(authInfo)
    })

    test("returns undefined when no entry matches the NPSSO hash (rotated NPSSO)", async () => {
      mockedReadFile.mockResolvedValue(
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

      await expect(
        PsnAuthStore.findByNpsso("npsso-value"),
      ).resolves.toBeUndefined()
    })

    test("returns undefined and does not throw on corrupt store contents", async () => {
      mockedReadFile.mockResolvedValue("{ not valid json")

      await expect(
        PsnAuthStore.findByNpsso("npsso-value"),
      ).resolves.toBeUndefined()
    })
  })

  describe("findByAccountId", () => {
    test("returns the entry stored under the given accountId", async () => {
      mockedReadFile.mockResolvedValue(
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

      await expect(
        PsnAuthStore.findByAccountId("account-1"),
      ).resolves.toEqual(expect.objectContaining({ accountId: "account-1" }))
      await expect(
        PsnAuthStore.findByAccountId("unknown"),
      ).resolves.toBeUndefined()
    })
  })

  describe("save", () => {
    test("writes atomically (tmp file + rename) with 0o600 permissions", async () => {
      await PsnAuthStore.save("account-1", {
        npssoHash: PsnAuthStore.hashNpsso("npsso-value"),
        accountId: "account-1",
        accountName: "MyUser",
        authInfo,
      })

      expect(mockedMkdir).toHaveBeenCalledWith(
        "/store",
        expect.objectContaining({ recursive: true }),
      )

      expect(mockedWriteFile).toHaveBeenCalledTimes(1)
      const [tmpPath, contents, options] = mockedWriteFile.mock.calls[0]
      expect(tmpPath).toMatch(/psn-auth\.json\..*\.tmp$/)
      expect(options).toEqual(expect.objectContaining({ mode: 0o600 }))

      expect(mockedRename).toHaveBeenCalledWith(
        tmpPath,
        path.join("/store", "psn-auth.json"),
      )
      expect(mockedChmod).toHaveBeenCalledWith(
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

    test("migrates away from the previous key when the account key changes", async () => {
      const npssoHash = PsnAuthStore.hashNpsso("npsso-value")
      mockedReadFile.mockResolvedValue(
        JSON.stringify({
          version: 1,
          accounts: {
            [npssoHash]: { npssoHash, authInfo, updatedAt: "2024-01-01" },
          },
        }),
      )

      await PsnAuthStore.save(
        "account-1",
        { npssoHash, accountId: "account-1", authInfo },
        npssoHash,
      )

      const [, contents] = mockedWriteFile.mock.calls[0]
      const written = JSON.parse(contents as string)
      expect(written.accounts[npssoHash]).toBeUndefined()
      expect(written.accounts["account-1"]).toBeDefined()
    })
  })

  describe("remove", () => {
    test("deletes the entry for the given key", async () => {
      mockedReadFile.mockResolvedValue(
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

      await PsnAuthStore.remove("account-1")

      expect(mockedWriteFile).toHaveBeenCalledTimes(1)
      const [, contents] = mockedWriteFile.mock.calls[0]
      const written = JSON.parse(contents as string)
      expect(written.accounts["account-1"]).toBeUndefined()
    })

    test("is a no-op when the key isn't present", async () => {
      mockedReadFile.mockRejectedValue(enoent())

      await PsnAuthStore.remove("account-1")

      expect(mockedWriteFile).not.toHaveBeenCalled()
    })
  })
})
