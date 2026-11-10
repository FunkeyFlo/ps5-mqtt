import { readInvocations, setFixture } from "./support/fixtures"
import { ServerHandle, startServer } from "./support/server-harness"

// https://github.com/FunkeyFlo/ps5-mqtt/issues/701
// The console answers /sess/init, then rejects /sess/ctrl with 403 / 80108bff
// on the first attempt and accepts it on the next.
describe("standby retry (e2e)", () => {
  let server: ServerHandle

  beforeAll(async () => {
    server = await startServer({ deviceStatus: "AWAKE" })
  })

  afterAll(async () => {
    await server?.stop()
  })

  test("retries standby when the console rejects the control session once", async () => {
    setFixture(server.fixtureDir, "standby", [
      {
        exitCode: 1,
        stderr: "Registration error: 403: Forbidden: Other Error\n",
      },
      { exitCode: 0 },
    ])

    await server.mqtt.publish(
      `ps5-mqtt/${server.deviceId}/set/power`,
      "STANDBY",
    )

    // The first attempt fails at once; the retry follows after a 10s pause.
    const state = await server.mqtt.waitForMessage(
      `ps5-mqtt/${server.deviceId}`,
      (payload) => typeof payload === "object" && payload.power === "STANDBY",
      30000,
    )

    expect(state).toMatchObject({ power: "STANDBY" })
    const standbyCalls = readInvocations(server.fixtureDir).filter(
      (invocation) => invocation.subcommand === "standby",
    )
    expect(standbyCalls).toHaveLength(2)
  })
})
