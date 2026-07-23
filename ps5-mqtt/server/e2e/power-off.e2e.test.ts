import { readInvocations, setFixture } from "./support/fixtures"
import { ServerHandle, startServer } from "./support/server-harness"

describe("power off (e2e)", () => {
  let server: ServerHandle

  beforeAll(async () => {
    server = await startServer({ deviceStatus: "AWAKE" })
  })

  afterAll(async () => {
    await server?.stop()
  })

  test("puts the console into standby and reports STANDBY over MQTT", async () => {
    // Real `playactor standby` returns nothing on stdout and exits 0 on success.
    setFixture(server.fixtureDir, "standby", {
      exitCode: 0,
      stdout: "",
      stderr: "",
    })

    await server.mqtt.publish(
      `ps5-mqtt/${server.deviceId}/set/power`,
      "STANDBY",
    )

    const state = await server.mqtt.waitForMessage(
      `ps5-mqtt/${server.deviceId}`,
      (payload) => typeof payload === "object" && payload.power === "STANDBY",
      20000,
    )

    expect(state).toMatchObject({
      power: "STANDBY",
      device_status: "online",
      activity: "none",
    })

    const standbyCalls = readInvocations(server.fixtureDir).filter(
      (invocation) => invocation.subcommand === "standby",
    )
    expect(standbyCalls).toHaveLength(1)
    expect(standbyCalls[0].argv.join(" ")).toContain("--ip 127.0.0.1")
  })
})
