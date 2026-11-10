import createDebugger from "debug"
import path from "path"
import sh from "shelljs"

import type { Device } from "../redux/types"
import { buildPassCodeArg } from "../util/pass-code"

const debug = createDebugger("@ha:ps5:playactor")

export interface PlayactorClientSettings {
  credentialStoragePath: string
  loginPasscode?: string
  allowPs4Devices?: boolean
  /**
   * Pauses between standby attempts when the console rejects the Remote Play
   * control session (see `isControlSessionRejection`). One entry per retry, so
   * the default allows three attempts in total. Overridable for tests.
   */
  standbyRetryDelaysMs?: readonly number[]
}

// Standby requires a full Remote Play handshake (discovery, session init,
// login, passcode, then the standby request itself), which can take much
// longer than a simple wake. The shelljs timeout must safely exceed the sum
// of the discovery/connect timeouts below so a slow but healthy handshake
// isn't killed mid-flight. https://github.com/FunkeyFlo/ps5-mqtt/issues/675
const STANDBY_DISCOVERY_TIMEOUT_MS = 10000
const STANDBY_CONNECT_TIMEOUT_MS = 10000
const STANDBY_SHELLJS_TIMEOUT_MS = 25000

const WAKE_SHELLJS_TIMEOUT_MS = 5000

// https://github.com/FunkeyFlo/ps5-mqtt/issues/701
// The console intermittently answers `/sie/ps5/rp/sess/init` and then rejects
// `/sie/ps5/rp/sess/ctrl` with `403` and `rp-application-reason: 80108bff`
// (playactor reports it as "Registration error: 403: Forbidden: Other Error";
// 80108bff is not a code playactor knows, it falls into its catch-all). In
// the report the same command succeeded when repeated two minutes later, so
// the whole `playactor standby` (fresh discovery, fresh session nonce, fresh
// ctrl request) is repeated a bounded number of times with a growing pause.
// Why the console rejects the session is not established; the pauses are a
// guess at "long enough for a console that has just woken to settle".
const DEFAULT_STANDBY_RETRY_DELAYS_MS: readonly number[] = [10000, 30000]

// Every playactor child gets the shim from ./preload.ts (built next to
// index.js). Appended to NODE_OPTIONS, not replacing it: under Yarn PnP it
// already carries the PnP loader the child needs to resolve `playactor`.
// https://github.com/FunkeyFlo/ps5-mqtt/issues/678
const PLAYACTOR_ENV: NodeJS.ProcessEnv = {
  ...process.env,
  NODE_OPTIONS: [
    process.env.NODE_OPTIONS,
    `--require "${path.join(__dirname, "playactor-preload.js")}"`,
  ]
    .filter(Boolean)
    .join(" "),
}

// Matches the failure `playactor` prints when `/sess/ctrl` is rejected with a
// reason code it has no specific message for. Other 403 reasons (invalid PIN,
// remote play already in use, ...) carry their own text and are not retried:
// repeating those cannot help.
const CONTROL_SESSION_REJECTION =
  /Registration error: 403: Forbidden: Other Error/

export const isControlSessionRejection = (error: unknown): boolean =>
  typeof error === "string"
    ? CONTROL_SESSION_REJECTION.test(error)
    : error instanceof Error && CONTROL_SESSION_REJECTION.test(error.message)

/**
 * Reduce a playactor failure to one short line that is safe to log: only the
 * first line, with anything hex-key shaped (Remote Play registration keys and
 * nonces are long hex strings) masked, and bounded in length.
 */
export const summarizeFailure = (error: unknown): string => {
  const text = error instanceof Error ? error.message : String(error)
  return (
    text
      .split(/\r?\n/)
      .find((line) => line.trim() !== "")
      ?.replace(/\b[0-9a-fA-F]{16,}\b/g, "<redacted>")
      .trim()
      .slice(0, 200) ?? "no output"
  )
}

/**
 * Thrown by `wake` when playactor exits non-zero without writing to stderr.
 * `playactor wake` sends the WAKEUP packet first and only then waits for the
 * console to report AWAKE, bounded by the same 5s budget as the shelljs kill.
 * A console that takes longer than that to come up therefore looks like a
 * failure although it is waking. https://github.com/FunkeyFlo/ps5-mqtt/issues/701
 */
export class WakeUnconfirmedError extends Error {
  constructor(code: number) {
    super(
      `playactor wake exited with code ${code} before the console reported ` +
        "AWAKE. The wake signal was already sent, so the console may still " +
        "be waking; its state is reconciled by the next device check.",
    )
    this.name = "WakeUnconfirmedError"
  }
}

const delayMillis = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms))

/**
 * Thin wrapper around the `playactor` CLI. Centralizes the command building,
 * `sh.exec` invocation, and result parsing that used to be duplicated inline
 * across the turn-on/turn-off/check sagas, giving those sagas a single mockable
 * seam. Behavior (flags, timeouts, error semantics, JSON parsing) is preserved
 * exactly as it was in the sagas.
 */
export interface PlayactorClient {
  wake(ip: string): Promise<void>
  standby(ip: string): Promise<void>
  check(ip: string): Promise<Device>
}

export function createPlayactorClient({
  credentialStoragePath,
  loginPasscode,
  allowPs4Devices,
  standbyRetryDelaysMs = DEFAULT_STANDBY_RETRY_DELAYS_MS,
}: PlayactorClientSettings): PlayactorClient {
  // Ignore non-PS5 devices during discovery when PS4 devices are excluded,
  // shaving discovery latency off the timeout budget below.
  const devicePs5Arg = allowPs4Devices === false ? " --ps5" : ""

  const buildWakeCommand = (ip: string): string =>
    `playactor wake --ip ${ip}` +
    ` --timeout 5000 --connect-timeout 5000 --no-open-urls --no-auth` +
    buildPassCodeArg(loginPasscode) +
    devicePs5Arg +
    ` -c ${credentialStoragePath}`

  const buildStandbyCommand = (ip: string): string =>
    `playactor standby --ip ${ip}` +
    ` --timeout ${STANDBY_DISCOVERY_TIMEOUT_MS}` +
    ` --connect-timeout ${STANDBY_CONNECT_TIMEOUT_MS} --no-open-urls --no-auth` +
    buildPassCodeArg(loginPasscode) +
    devicePs5Arg +
    ` -c ${credentialStoragePath}`

  const buildCheckCommand = (ip: string): string =>
    `playactor check --ip ${ip} --machine-friendly` +
    ` --timeout 15000 --connect-timeout 10000 --no-open-urls --no-auth` +
    ` -c ${credentialStoragePath}`

  // wake/standby share identical exec + error handling; only the sub-command
  // and shelljs timeout differ.
  const runPowerCommand = async (
    command: string,
    shelljsTimeoutMillis: number,
    onNonZeroExit?: (code: number) => Error,
  ): Promise<void> => {
    const { code, stdout, stderr } = sh.exec(command, {
      silent: true,
      timeout: shelljsTimeoutMillis,
      env: PLAYACTOR_ENV,
    })

    if (stderr) {
      throw stderr
    }

    // A shelljs timeout-kill produces no stderr, so `code` is the only
    // remaining signal that the command didn't actually complete - without
    // this check, a standby/wake killed mid-handshake looks identical to a
    // successful one and gets optimistically reported to Home Assistant.
    // https://github.com/FunkeyFlo/ps5-mqtt/issues/675
    if (code !== 0) {
      throw (
        onNonZeroExit?.(code) ??
        new Error(
          `playactor exited with code ${code} without completing (it may ` +
            "have been killed after exceeding the timeout)",
        )
      )
    }

    debug(stdout)
  }

  // `sh.exec` blocks the event loop, so power commands never overlap on their
  // own. Pausing between standby attempts is asynchronous though, and a wake
  // or second standby must not open a Remote Play session in that gap, so
  // power commands queue behind each other.
  let powerQueue: Promise<unknown> = Promise.resolve()
  const serialized = <T>(task: () => Promise<T>): Promise<T> => {
    const run = powerQueue.then(task, task)
    powerQueue = run.catch(() => undefined)
    return run
  }

  const lastWakeAt = new Map<string, number>()
  const describeWakeAge = (ip: string): string => {
    const at = lastWakeAt.get(ip)
    return at === undefined
      ? "no wake command from this add-on since it started"
      : `${Math.round((Date.now() - at) / 1000)}s after the last wake command from this add-on`
  }

  const standbyWithRetry = async (ip: string): Promise<void> => {
    const maxAttempts = standbyRetryDelaysMs.length + 1
    for (let attempt = 1; ; attempt++) {
      const startedAt = Date.now()
      try {
        await runPowerCommand(
          buildStandbyCommand(ip),
          STANDBY_SHELLJS_TIMEOUT_MS,
        )
        if (attempt > 1) {
          debug(`standby for ${ip} succeeded on attempt ${attempt}`)
        }
        return
      } catch (error) {
        const retryDelay = standbyRetryDelaysMs[attempt - 1]
        const retryable =
          isControlSessionRejection(error) && retryDelay !== undefined
        debug(
          `standby for ${ip} failed (attempt ${attempt}/${maxAttempts}, ` +
            `${Date.now() - startedAt}ms, ${describeWakeAge(ip)}): ` +
            summarizeFailure(error) +
            (retryable
              ? `. The console rejected the control session; retrying in ${retryDelay}ms`
              : ""),
        )
        if (!retryable) {
          throw error
        }
        await delayMillis(retryDelay)
      }
    }
  }

  return {
    wake(ip: string): Promise<void> {
      return serialized(async () => {
        lastWakeAt.set(ip, Date.now())
        await runPowerCommand(
          buildWakeCommand(ip),
          WAKE_SHELLJS_TIMEOUT_MS,
          (code) => new WakeUnconfirmedError(code),
        )
      })
    },

    standby(ip: string): Promise<void> {
      return serialized(() => standbyWithRetry(ip))
    },

    async check(ip: string): Promise<Device> {
      const { code, stdout, stderr } = sh.exec(buildCheckCommand(ip), {
        silent: true,
        timeout: 15000,
        env: PLAYACTOR_ENV,
      })

      if (code > 1 && stderr) {
        throw new Error(stderr)
      }

      if (!stdout) {
        throw (
          "No data received from Playstation. If this error continues, " +
          "your Playstation is likely powered off or unreachable - it will " +
          "not be available until it is in either rest mode/powered on and reachable."
        )
      }

      return JSON.parse(stdout) as Device
    },
  }
}
