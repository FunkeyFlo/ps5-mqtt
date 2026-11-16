import { readInvocations, setFixture } from "./support/fixtures"
import { ServerHandle, startServer } from "./support/server-harness"

// https://github.com/FunkeyFlo/ps5-mqtt/issues/712
// The first standby after a wake stalls until the shelljs timeout kills it
// (non-zero exit, nothing on stdout or stderr); the same command sent again
// straight away succeeds.
describe("standby timeout retry (e2e)", () => {
  let server: ServerHandle

  beforeAll(async () => {
    server = await startServer({ deviceStatus: "AWAKE" })
  })

  afterAll(async () => {
    await server?.stop()
  })

  test("retries standby when playactor is killed by the timeout once", async () => {
    setFixture(server.fixtureDir, "standby", [
      { exitCode: 1, stdout: "", stderr: "" },
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
