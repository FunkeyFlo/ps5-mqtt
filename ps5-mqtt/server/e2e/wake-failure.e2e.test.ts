import { readInvocations, setFixture } from "./support/fixtures"
import { ServerHandle, startServer } from "./support/server-harness"

describe("wake failure (e2e)", () => {
  let server: ServerHandle

  beforeAll(async () => {
    server = await startServer({ deviceStatus: "STANDBY" })
  })

  afterAll(async () => {
    await server?.stop()
  })

  test("does not report a state change when playactor wake fails", async () => {
    setFixture(server.fixtureDir, "wake", {
      exitCode: 1,
      stdout: "",
      stderr: "PASSCODE_IS_NEEDED",
    })

    await server.mqtt.publish(`ps5-mqtt/${server.deviceId}/set/power`, "AWAKE")

    // turn-on-device swallows the error (logs it) without dispatching
    // updateHomeAssistant, so no message reporting AWAKE should ever appear.
    await expect(
      server.mqtt.waitForMessage(
        `ps5-mqtt/${server.deviceId}`,
        (payload) => typeof payload === "object" && payload.power === "AWAKE",
        5000,
      ),
    ).rejects.toThrow(/Timed out/)

    // The real command still ran (and really failed) — this isn't a no-op.
    const wakeCalls = readInvocations(server.fixtureDir).filter(
      (invocation) => invocation.subcommand === "wake",
    )
    expect(wakeCalls).toHaveLength(1)
  })
})
