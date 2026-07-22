import { ChildProcess, spawn } from "child_process"
import fs from "fs"
import os from "os"
import path from "path"
import { pathToFileURL } from "url"

import { createTestMqttClient, TestMqttClient } from "./mqtt-test-client"

// e2e/support -> e2e -> server -> ps5-mqtt -> repo root
const SERVER_DIR = path.resolve(__dirname, "..", "..")
const REPO_ROOT = path.resolve(SERVER_DIR, "..", "..")
const FAKE_PLAYACTOR_DIR = path.resolve(__dirname, "..", "fake-playactor")

// Run the built server under Node's Yarn PnP runtime directly, instead of via
// `yarn node`. `yarn node` prepends Yarn's bin-shim directory (which includes
// the real `playactor` binary) to PATH, shadowing our fake; spawning node
// ourselves keeps our fake-playactor dir first on PATH.
const PNP_NODE_OPTIONS =
  `--require ${path.join(REPO_ROOT, ".pnp.cjs")}` +
  ` --experimental-loader ${pathToFileURL(path.join(REPO_ROOT, ".pnp.loader.mjs")).href}`

export interface StartServerOptions {
  deviceId?: string
  deviceAddress?: string
  deviceStatus?: "STANDBY" | "AWAKE"
  /** How often check-devices-state polls. Defaults to effectively never. */
  deviceCheckInterval?: number
  /** Forwarded to playactor as `--pass-code` when set. */
  loginPasscode?: string
}

export interface ServerHandle {
  deviceId: string
  fixtureDir: string
  mqtt: TestMqttClient
  stop(): Promise<void>
}

const randomSuffix = (): string => Math.random().toString(36).slice(2, 8)

const stopChild = (child: ChildProcess): Promise<void> =>
  new Promise((resolve) => {
    if (child.exitCode !== null || child.signalCode !== null) {
      resolve()
      return
    }
    const forceKill = setTimeout(() => child.kill("SIGKILL"), 5000)
    child.once("exit", () => {
      clearTimeout(forceKill)
      resolve()
    })
    child.kill("SIGTERM")
  })

/**
 * Boot the real, built server (`dist/index.js`) against the running dev-services
 * mosquitto broker, with the fake `playactor` binary first on PATH and one
 * statically-seeded device. Resolves once the seeded device's retained state
 * has been published (i.e. the server is fully up).
 */
export async function startServer(
  options: StartServerOptions = {},
): Promise<ServerHandle> {
  const deviceId = options.deviceId ?? `test-ps5-${randomSuffix()}`
  const deviceAddress = options.deviceAddress ?? "127.0.0.1"
  const deviceStatus = options.deviceStatus ?? "STANDBY"

  const tmpBase = fs.mkdtempSync(path.join(os.tmpdir(), "ps5-mqtt-e2e-"))
  const fixtureDir = path.join(tmpBase, "fixtures")
  fs.mkdirSync(fixtureDir)
  const credentialPath = path.join(tmpBase, "credentials.json")

  const staticDevice = {
    id: deviceId,
    name: deviceId,
    address: { address: deviceAddress, port: 9295 },
    systemVersion: "00000000",
    type: "PS5",
    status: deviceStatus,
    available: true,
    transitioning: false,
  }

  const env: NodeJS.ProcessEnv = {
    ...process.env,
    PATH: `${FAKE_PLAYACTOR_DIR}${path.delimiter}${process.env.PATH ?? ""}`,
    NODE_OPTIONS: PNP_NODE_OPTIONS,
    MQTT_HOST: "localhost",
    MQTT_PORT: "1883",
    CREDENTIAL_STORAGE_PATH: credentialPath,
    PLAYACTOR_FIXTURE_DIR: fixtureDir,
    STATIC_DEVICES: JSON.stringify([staticDevice]),
    DISCOVERY_TOPIC: "homeassistant",
    // Suppress real UDP discovery / PSN polling during the test.
    DEVICE_DISCOVERY_INTERVAL: "3600000",
    ACCOUNT_CHECK_INTERVAL: "3600000",
    DEVICE_CHECK_INTERVAL: String(options.deviceCheckInterval ?? 3600000),
    // 0 -> an ephemeral port, so parallel-safe even if run mode changes later.
    FRONTEND_PORT: "0",
  }

  if (options.loginPasscode !== undefined) {
    env.LOGIN_PASSCODE = options.loginPasscode
  }

  const child = spawn(process.execPath, ["dist/index.js"], {
    cwd: SERVER_DIR,
    env,
    stdio: ["ignore", "pipe", "pipe"],
  })

  const logs: string[] = []
  child.stdout?.on("data", (chunk: Buffer) => logs.push(chunk.toString()))
  child.stderr?.on("data", (chunk: Buffer) => logs.push(chunk.toString()))

  const mqtt = await createTestMqttClient("mqtt://localhost:1883")

  try {
    // Readiness: the seeded device's registration publishes retained state here.
    await mqtt.waitForMessage(`ps5-mqtt/${deviceId}`, () => true, 30000)
  } catch (error) {
    await mqtt.end()
    child.kill("SIGKILL")
    fs.rmSync(tmpBase, { recursive: true, force: true })
    throw new Error(
      `Server did not become ready: ${(error as Error).message}\n` +
        `--- server output ---\n${logs.join("")}`,
      { cause: error },
    )
  }

  return {
    deviceId,
    fixtureDir,
    mqtt,
    async stop() {
      await mqtt.end()
      await stopChild(child)
      fs.rmSync(tmpBase, { recursive: true, force: true })
    },
  }
}
