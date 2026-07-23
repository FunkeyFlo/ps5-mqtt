import { readInvocations, setFixture } from "./support/fixtures"
import { ServerHandle, startServer } from "./support/server-harness"

describe("login passcode forwarding (e2e)", () => {
  let server: ServerHandle

  beforeAll(async () => {
    server = await startServer({
      deviceStatus: "STANDBY",
      loginPasscode: "1234",
    })
  })

  afterAll(async () => {
    await server?.stop()
  })

  test("forwards the configured passcode to playactor as --pass-code", async () => {
    setFixture(server.fixtureDir, "wake", {
      exitCode: 0,
      stdout: "",
      stderr: "",
    })

    await server.mqtt.publish(`ps5-mqtt/${server.deviceId}/set/power`, "AWAKE")

    await server.mqtt.waitForMessage(
      `ps5-mqtt/${server.deviceId}`,
      (payload) => typeof payload === "object" && payload.power === "AWAKE",
      20000,
    )

    const wakeCalls = readInvocations(server.fixtureDir).filter(
      (invocation) => invocation.subcommand === "wake",
    )
    expect(wakeCalls).toHaveLength(1)
    // The shell consumes the surrounding quotes shelljs/buildPassCodeArg add
    // before exec-ing the fake binary, so argv sees the bare flag + value.
    expect(wakeCalls[0].argv).toEqual(
      expect.arrayContaining(["--pass-code", "1234"]),
    )
  })
})
