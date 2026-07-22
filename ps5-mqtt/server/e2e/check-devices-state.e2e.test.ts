import { setFixture } from "./support/fixtures"
import { ServerHandle, startServer } from "./support/server-harness"

describe("check devices state polling (e2e)", () => {
  let server: ServerHandle

  beforeAll(async () => {
    // Fast polling so the scenario doesn't need a long test timeout.
    server = await startServer({
      deviceStatus: "STANDBY",
      deviceCheckInterval: 300,
    })
  })

  afterAll(async () => {
    await server?.stop()
  })

  test("picks up a status change without a set/power command", async () => {
    // Simulate the console having been turned on out-of-band (e.g. by a
    // controller): the periodic `playactor check` poll should notice on its
    // own, with no MQTT command ever published by the test.
    setFixture(server.fixtureDir, "check", {
      exitCode: 0,
      stdout: JSON.stringify({ status: "AWAKE", activity: null }),
      stderr: "",
    })

    const state = await server.mqtt.waitForMessage(
      `ps5-mqtt/${server.deviceId}`,
      (payload) => typeof payload === "object" && payload.power === "AWAKE",
      15000,
    )

    expect(state).toMatchObject({ power: "AWAKE", device_status: "online" })
  })

  test("marks the console unavailable once checks start failing", async () => {
    setFixture(server.fixtureDir, "check", {
      exitCode: 2,
      stdout: "",
      stderr: "unreachable",
    })

    const state = await server.mqtt.waitForMessage(
      `ps5-mqtt/${server.deviceId}`,
      (payload) =>
        typeof payload === "object" && payload.device_status === "offline",
      15000,
    )

    expect(state).toMatchObject({ power: "UNKNOWN", device_status: "offline" })
  })
})
