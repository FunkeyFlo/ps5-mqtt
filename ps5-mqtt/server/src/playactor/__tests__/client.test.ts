import lodash from "lodash"
import sh from "shelljs"

import type { Device } from "../../redux/types"
import {
  createPlayactorClient,
  isControlSessionRejection,
  summarizeFailure,
  WakeUnconfirmedError,
} from "../client"

jest.mock("shelljs")

const mockExec = jest.mocked(sh.exec)

type ExecReturn = ReturnType<typeof sh.exec>

const CREDENTIAL_PATH = "/tmp/creds.json"
const IP = "192.168.0.10"

const WAKE_CMD =
  `playactor wake --ip ${IP}` +
  ` --timeout 5000 --connect-timeout 5000 --no-open-urls --no-auth` +
  ` -c ${CREDENTIAL_PATH}`

const STANDBY_CMD =
  `playactor standby --ip ${IP}` +
  ` --timeout 10000 --connect-timeout 10000 --no-open-urls --no-auth` +
  ` -c ${CREDENTIAL_PATH}`

const CHECK_CMD =
  `playactor check --ip ${IP} --machine-friendly` +
  ` --timeout 15000 --connect-timeout 10000 --no-open-urls --no-auth` +
  ` -c ${CREDENTIAL_PATH}`

// Every playactor invocation must carry the preload shim in NODE_OPTIONS
// (see ../preload.ts); the exact path differs between ts-jest (src/) and the
// built bundle (dist/), so only the file name is pinned here.
const execOptions = (timeout: number) => ({
  silent: true,
  timeout,
  env: expect.objectContaining({
    NODE_OPTIONS: expect.stringContaining("playactor-preload.js"),
  }),
})

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
      expect(mockExec).toHaveBeenCalledWith(WAKE_CMD, execOptions(5000))
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
        execOptions(5000),
      )
    })

    test("throws the raw stderr when playactor writes to stderr", async () => {
      mockExec.mockReturnValue(execResult({ code: 0, stderr: "boom" }))

      await expect(client.wake(IP)).rejects.toBe("boom")
    })

    test("passes --ps5 when PS4 devices are excluded", async () => {
      mockExec.mockReturnValue(execResult({ code: 0, stdout: "ok" }))
      const ps5OnlyClient = createPlayactorClient({
        credentialStoragePath: CREDENTIAL_PATH,
        allowPs4Devices: false,
      })

      await ps5OnlyClient.wake(IP)

      expect(mockExec).toHaveBeenCalledWith(
        `playactor wake --ip ${IP}` +
          ` --timeout 5000 --connect-timeout 5000 --no-open-urls --no-auth` +
          ` --ps5 -c ${CREDENTIAL_PATH}`,
        execOptions(5000),
      )
    })

    // https://github.com/FunkeyFlo/ps5-mqtt/issues/675
    test("rejects when killed by the shelljs timeout (no stderr, non-zero exit code)", async () => {
      mockExec.mockReturnValue(execResult({ code: 1, stdout: "", stderr: "" }))

      await expect(client.wake(IP)).rejects.toThrow(/exited with code 1/)
    })

    // https://github.com/FunkeyFlo/ps5-mqtt/issues/701
    // playactor sends WAKEUP before it waits for AWAKE, so a non-zero exit
    // with no stderr is "not confirmed in time", not "never woken".
    test("flags a timeout-kill as an unconfirmed wake rather than a failed one", async () => {
      mockExec.mockReturnValue(execResult({ code: 1, stdout: "", stderr: "" }))

      await expect(client.wake(IP)).rejects.toBeInstanceOf(WakeUnconfirmedError)
    })
  })

  describe("standby", () => {
    test("builds the correct command and resolves on success", async () => {
      mockExec.mockReturnValue(execResult({ code: 0, stdout: "ok" }))

      await expect(client.standby(IP)).resolves.toBeUndefined()
      expect(mockExec).toHaveBeenCalledWith(STANDBY_CMD, execOptions(25000))
    })

    test("throws the raw stderr when playactor writes to stderr", async () => {
      mockExec.mockReturnValue(execResult({ code: 0, stderr: "nope" }))

      await expect(client.standby(IP)).rejects.toBe("nope")
    })

    test("passes --ps5 when PS4 devices are excluded", async () => {
      mockExec.mockReturnValue(execResult({ code: 0, stdout: "ok" }))
      const ps5OnlyClient = createPlayactorClient({
        credentialStoragePath: CREDENTIAL_PATH,
        allowPs4Devices: false,
      })

      await ps5OnlyClient.standby(IP)

      expect(mockExec).toHaveBeenCalledWith(
        `playactor standby --ip ${IP}` +
          ` --timeout 10000 --connect-timeout 10000 --no-open-urls --no-auth` +
          ` --ps5 -c ${CREDENTIAL_PATH}`,
        execOptions(25000),
      )
    })

    // https://github.com/FunkeyFlo/ps5-mqtt/issues/675
    // Standby's full handshake (discovery, session init, login, passcode,
    // then the standby request) can outlast a short shelljs timeout. When
    // shelljs kills the process, it exits with code 1 and empty
    // stdout/stderr - nothing throws, so the old stderr-only check never
    // fired and the saga optimistically reported STANDBY even though the
    // console never actually went to standby. Verified this is really how
    // shelljs behaves on a timeout-kill (sh.exec("sleep N", { timeout:
    // shortMs }) consistently returns { code: 1, stdout: "", stderr: "" });
    // it could not be reproduced against real PS5 hardware.
    test("rejects when killed by the shelljs timeout (no stderr, non-zero exit code)", async () => {
      mockExec.mockReturnValue(execResult({ code: 1, stdout: "", stderr: "" }))

      await expect(client.standby(IP)).rejects.toThrow(/exited with code 1/)
    })
  })

  // https://github.com/FunkeyFlo/ps5-mqtt/issues/701
  // A faithful fake of the reported console: `/sess/init` answers, then
  // `/sess/ctrl` is rejected with 403 / 80108bff on the first attempt (which
  // playactor prints as "Registration error: 403: Forbidden: Other Error") and
  // accepted on the next. The same stderr the user saw is replayed here.
  describe("standby when the console rejects the control session", () => {
    const CTRL_REJECTED = execResult({
      code: 1,
      stderr: "Registration error: 403: Forbidden: Other Error\n",
    })
    const retryingClient = createPlayactorClient({
      credentialStoragePath: CREDENTIAL_PATH,
      standbyRetryDelaysMs: [1, 1],
    })

    test("repeats the whole standby command and succeeds on the retry", async () => {
      mockExec
        .mockReturnValueOnce(CTRL_REJECTED)
        .mockReturnValueOnce(execResult({ code: 0 }))

      await expect(retryingClient.standby(IP)).resolves.toBeUndefined()

      // Same full command each time: playactor re-discovers and opens a
      // fresh session (fresh nonce) per run.
      expect(mockExec).toHaveBeenCalledTimes(2)
      expect(mockExec).toHaveBeenNthCalledWith(
        1,
        STANDBY_CMD,
        execOptions(25000),
      )
      expect(mockExec).toHaveBeenNthCalledWith(
        2,
        STANDBY_CMD,
        execOptions(25000),
      )
    })

    test("gives up after the bounded number of attempts and surfaces the last error", async () => {
      mockExec.mockReturnValue(CTRL_REJECTED)

      await expect(retryingClient.standby(IP)).rejects.toBe(
        "Registration error: 403: Forbidden: Other Error\n",
      )
      expect(mockExec).toHaveBeenCalledTimes(3)
    })

    test.each([
      [
        "a different 403 reason",
        "Registration error: 403: Forbidden: Remote is already in use",
      ],
      ["a missing passcode", "PASSCODE_IS_NEEDED"],
      ["an unreachable console", "Error: Could not find device"],
    ])("does not retry %s", async (_name, stderr) => {
      mockExec.mockReturnValue(execResult({ code: 1, stderr }))

      await expect(retryingClient.standby(IP)).rejects.toBe(stderr)
      expect(mockExec).toHaveBeenCalledTimes(1)
    })

    test("does not retry a shelljs timeout-kill", async () => {
      mockExec.mockReturnValue(execResult({ code: 1, stdout: "", stderr: "" }))

      await expect(retryingClient.standby(IP)).rejects.toThrow(
        /exited with code 1/,
      )
      expect(mockExec).toHaveBeenCalledTimes(1)
    })

    test("a wake issued while standby is pausing between attempts waits its turn", async () => {
      mockExec
        .mockReturnValueOnce(CTRL_REJECTED)
        .mockReturnValue(execResult({ code: 0 }))

      const standby = retryingClient.standby(IP)
      const wake = retryingClient.wake(IP)
      await Promise.all([standby, wake])

      expect(
        mockExec.mock.calls.map(([command]) => command.split(" ")[1]),
      ).toEqual(["standby", "standby", "wake"])
    })

    test("a failed standby does not block the next power command", async () => {
      mockExec
        .mockReturnValueOnce(
          execResult({ code: 1, stderr: "PASSCODE_IS_NEEDED" }),
        )
        .mockReturnValue(execResult({ code: 0 }))

      await expect(retryingClient.standby(IP)).rejects.toBe(
        "PASSCODE_IS_NEEDED",
      )
      await expect(retryingClient.wake(IP)).resolves.toBeUndefined()
    })
  })

  describe("isControlSessionRejection", () => {
    test("matches only the generic 403 rejection", () => {
      expect(
        isControlSessionRejection(
          "Registration error: 403: Forbidden: Other Error",
        ),
      ).toBe(true)
      expect(
        isControlSessionRejection(
          new Error("Registration error: 403: Forbidden: Other Error"),
        ),
      ).toBe(true)
      expect(
        isControlSessionRejection("Registration error: 403: Forbidden"),
      ).toBe(false)
      expect(isControlSessionRejection(undefined)).toBe(false)
    })
  })

  describe("summarizeFailure", () => {
    test("keeps one line, masks key-shaped hex strings and bounds the length", () => {
      const key = "0123456789abcdef0123456789abcdef"
      expect(
        summarizeFailure(`failed for key ${key}\n    at stack frame`),
      ).toBe("failed for key <redacted>")
      expect(summarizeFailure("x".repeat(500))).toHaveLength(200)
      expect(summarizeFailure("")).toBe("no output")
    })
  })

  describe("check", () => {
    test("builds the correct command and returns the parsed device", async () => {
      mockExec.mockReturnValue(
        execResult({ code: 0, stdout: JSON.stringify(makeDevice()) }),
      )

      await expect(client.check(IP)).resolves.toEqual(makeDevice())
      expect(mockExec).toHaveBeenCalledWith(CHECK_CMD, execOptions(15000))
    })

    test("throws an Error when exit code > 1 and stderr is present", async () => {
      mockExec.mockReturnValue(execResult({ code: 2, stderr: "bad" }))

      await expect(client.check(IP)).rejects.toThrow("bad")
    })

    test("does not treat exit code > 1 without stderr as an error", async () => {
      mockExec.mockReturnValue(
        execResult({
          code: 2,
          stdout: JSON.stringify(makeDevice()),
          stderr: "",
        }),
      )

      await expect(client.check(IP)).resolves.toEqual(makeDevice())
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

// --- helpers ---

const DEFAULT_DEVICE: Device = {
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

function makeDevice(overrides: Partial<Device> = {}): Device {
  return lodash.merge({}, DEFAULT_DEVICE, overrides)
}

function execResult(
  over: Partial<{ code: number; stdout: string; stderr: string }> = {},
): ExecReturn {
  return { code: 0, stdout: "", stderr: "", ...over } as unknown as ExecReturn
}
