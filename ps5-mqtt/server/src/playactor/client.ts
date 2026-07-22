import createDebugger from "debug"
import sh from "shelljs"

import type { Device } from "../redux/types"
import { buildPassCodeArg } from "../util/pass-code"

const debug = createDebugger("@ha:ps5:playactor")

export interface PlayactorClientSettings {
  credentialStoragePath: string
  loginPasscode?: string
}

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
}: PlayactorClientSettings): PlayactorClient {
  const buildWakeCommand = (ip: string): string =>
    `playactor wake --ip ${ip}` +
    ` --timeout 5000 --connect-timeout 5000 --no-open-urls --no-auth` +
    buildPassCodeArg(loginPasscode) +
    ` -c ${credentialStoragePath}`

  const buildStandbyCommand = (ip: string): string =>
    `playactor standby --ip ${ip}` +
    ` --timeout 5000 --connect-timeout 5000 --no-open-urls --no-auth` +
    buildPassCodeArg(loginPasscode) +
    ` -c ${credentialStoragePath}`

  const buildCheckCommand = (ip: string): string =>
    `playactor check --ip ${ip} --machine-friendly` +
    ` --timeout 15000 --connect-timeout 10000 --no-open-urls --no-auth` +
    ` -c ${credentialStoragePath}`

  // wake/standby share identical exec + error handling; only the sub-command differs.
  const runPowerCommand = async (command: string): Promise<void> => {
    const { stdout, stderr } = sh.exec(command, { silent: true, timeout: 5000 })

    if (stderr) {
      throw stderr
    }
    debug(stdout)
  }

  return {
    async wake(ip: string): Promise<void> {
      await runPowerCommand(buildWakeCommand(ip))
    },

    async standby(ip: string): Promise<void> {
      await runPowerCommand(buildStandbyCommand(ip))
    },

    async check(ip: string): Promise<Device> {
      const { code, stdout, stderr } = sh.exec(buildCheckCommand(ip), {
        silent: true,
        timeout: 15000,
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
