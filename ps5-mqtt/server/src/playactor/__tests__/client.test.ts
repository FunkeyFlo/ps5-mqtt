import sh from "shelljs"

import type { Device } from "../../redux/types"
import { createPlayactorClient } from "../client"

jest.mock("shelljs")

const mockExec = jest.mocked(sh.exec)

type ExecReturn = ReturnType<typeof sh.exec>

const execResult = (
  over: Partial<{ code: number; stdout: string; stderr: string }> = {},
): ExecReturn =>
  ({ code: 0, stdout: "", stderr: "", ...over }) as unknown as ExecReturn

const CREDENTIAL_PATH = "/tmp/creds.json"
const IP = "192.168.0.10"

const WAKE_CMD =
  `playactor wake --ip ${IP}` +
  ` --timeout 5000 --connect-timeout 5000 --no-open-urls --no-auth` +
  ` -c ${CREDENTIAL_PATH}`

const STANDBY_CMD =
  `playactor standby --ip ${IP}` +
  ` --timeout 5000 --connect-timeout 5000 --no-open-urls --no-auth` +
  ` -c ${CREDENTIAL_PATH}`

const CHECK_CMD =
  `playactor check --ip ${IP} --machine-friendly` +
  ` --timeout 15000 --connect-timeout 10000 --no-open-urls --no-auth` +
  ` -c ${CREDENTIAL_PATH}`

const mockDevice: Device = {
  address: { address: IP, port: 80 },
  available: true,
  id: "mock-id-1",
  name: "mock-ps5-1",
  normalizedName: "mock_ps5_1",
  status: "AWAKE",
  systemVersion: "",
  transitioning: false,
  type: "PS5",
  activity: undefined,
}

describe("PlayactorClient", () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  const client = createPlayactorClient({
    credentialStoragePath: CREDENTIAL_PATH,
  })

  describe("wake", () => {
    test("builds the correct command and resolves on success", async () => {
      mockExec.mockReturnValue(execResult({ code: 0, stdout: "ok" }))

      await expect(client.wake(IP)).resolves.toBeUndefined()
      expect(mockExec).toHaveBeenCalledWith(WAKE_CMD, {
        silent: true,
        timeout: 5000,
      })
    })

    test("includes the --pass-code fragment when a passcode is configured", async () => {
      mockExec.mockReturnValue(execResult({ code: 0, stdout: "ok" }))
      const clientWithPasscode = createPlayactorClient({
        credentialStoragePath: CREDENTIAL_PATH,
        loginPasscode: "1234",
      })

      await clientWithPasscode.wake(IP)

      expect(mockExec).toHaveBeenCalledWith(
        `playactor wake --ip ${IP}` +
          ` --timeout 5000 --connect-timeout 5000 --no-open-urls --no-auth` +
          ` --pass-code '1234'` +
          ` -c ${CREDENTIAL_PATH}`,
        { silent: true, timeout: 5000 },
      )
    })

    test("throws the raw stderr when playactor writes to stderr", async () => {
      mockExec.mockReturnValue(execResult({ code: 0, stderr: "boom" }))

      await expect(client.wake(IP)).rejects.toBe("boom")
    })
  })

  describe("standby", () => {
    test("builds the correct command and resolves on success", async () => {
      mockExec.mockReturnValue(execResult({ code: 0, stdout: "ok" }))

      await expect(client.standby(IP)).resolves.toBeUndefined()
      expect(mockExec).toHaveBeenCalledWith(STANDBY_CMD, {
        silent: true,
        timeout: 5000,
      })
    })

    test("throws the raw stderr when playactor writes to stderr", async () => {
      mockExec.mockReturnValue(execResult({ code: 0, stderr: "nope" }))

      await expect(client.standby(IP)).rejects.toBe("nope")
    })
  })

  describe("check", () => {
    test("builds the correct command and returns the parsed device", async () => {
      mockExec.mockReturnValue(
        execResult({ code: 0, stdout: JSON.stringify(mockDevice) }),
      )

      await expect(client.check(IP)).resolves.toEqual(mockDevice)
      expect(mockExec).toHaveBeenCalledWith(CHECK_CMD, {
        silent: true,
        timeout: 15000,
      })
    })

    test("throws an Error when exit code > 1 and stderr is present", async () => {
      mockExec.mockReturnValue(execResult({ code: 2, stderr: "bad" }))

      await expect(client.check(IP)).rejects.toThrow("bad")
    })

    test("does not treat exit code > 1 without stderr as an error", async () => {
      mockExec.mockReturnValue(
        execResult({ code: 2, stdout: JSON.stringify(mockDevice), stderr: "" }),
      )

      await expect(client.check(IP)).resolves.toEqual(mockDevice)
    })

    test("throws the 'no data' message when stdout is empty", async () => {
      mockExec.mockReturnValue(execResult({ code: 0, stdout: "" }))

      await expect(client.check(IP)).rejects.toContain(
        "No data received from Playstation",
      )
    })

    test("propagates JSON parse errors for malformed stdout", async () => {
      mockExec.mockReturnValue(execResult({ code: 0, stdout: "not-json" }))

      await expect(client.check(IP)).rejects.toBeInstanceOf(SyntaxError)
    })
  })
})
