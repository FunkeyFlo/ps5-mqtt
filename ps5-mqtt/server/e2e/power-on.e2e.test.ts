import { readInvocations, setFixture } from "./support/fixtures"
import { ServerHandle, startServer } from "./support/server-harness"

describe("power on (e2e)", () => {
  let server: ServerHandle

  beforeAll(async () => {
    server = await startServer({ deviceStatus: "STANDBY" })
  })

  afterAll(async () => {
    await server?.stop()
  })

  test("wakes the console and reports AWAKE over MQTT", async () => {
    // Real `playactor wake` returns nothing on stdout and exits 0 on success.
    setFixture(server.fixtureDir, "wake", {
      exitCode: 0,
      stdout: "",
      stderr: "",
    })

    await server.mqtt.publish(`ps5-mqtt/${server.deviceId}/set/power`, "AWAKE")

    const state = await server.mqtt.waitForMessage(
      `ps5-mqtt/${server.deviceId}`,
      (payload) => typeof payload === "object" && payload.power === "AWAKE",
      20000,
    )

    expect(state).toMatchObject({ power: "AWAKE", device_status: "online" })

    // Proves the real command string + subprocess path executed.
    const wakeCalls = readInvocations(server.fixtureDir).filter(
      (invocation) => invocation.subcommand === "wake",
    )
    expect(wakeCalls).toHaveLength(1)
    const args = wakeCalls[0].argv.join(" ")
    expect(args).toContain("--ip 127.0.0.1")
    expect(args).toContain("-c")
    expect(args).toContain("credentials.json")
    expect(args).not.toContain("--pass-code")
  })
})
