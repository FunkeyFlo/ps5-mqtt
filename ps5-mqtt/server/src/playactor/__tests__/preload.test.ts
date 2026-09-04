import http from "http"
import net from "net"

// https://github.com/FunkeyFlo/ps5-mqtt/issues/678
// What playactor does for standby: keep-alive request, then take over the
// response socket while the console keeps talking on it. Without the shim,
// Node's free-socket data guard closes the socket on those bytes.
describe("playactor preload shim", () => {
  const OriginalAgent = http.Agent
  let server: net.Server

  beforeAll(async () => {
    jest.requireActual("../preload")
    server = net.createServer((socket) => {
      socket.once("data", () => {
        socket.write(
          "HTTP/1.1 200 OK\r\nConnection: keep-alive\r\nContent-Length: 0\r\n\r\n",
        )
        setTimeout(() => socket.write("login-result"), 100)
      })
    })
    await new Promise<void>((done) => server.listen(0, "127.0.0.1", done))
  })

  afterAll(() => {
    http.Agent = OriginalAgent
    server.close()
  })

  test("a taken-over keep-alive socket still receives data sent after the response", async () => {
    const { port } = server.address() as net.AddressInfo
    const agent = new http.Agent({ keepAlive: true })

    const received = new Promise<string>((resolve, reject) => {
      const req = http.get({ host: "127.0.0.1", port, agent }, (res) => {
        res.resume()
        // playactor only takes over after its HTTP client resolves, i.e.
        // after Node has already handed the socket back to the agent.
        res.on("end", () =>
          setImmediate(() => {
            const socket = req.socket as net.Socket
            socket.removeAllListeners()
            socket.on("data", (chunk) => resolve(chunk.toString()))
            socket.on("close", () =>
              reject(new Error("socket closed before the data arrived")),
            )
          }),
        )
      })
      req.on("error", reject)
    })

    await expect(received).resolves.toBe("login-result")
    agent.destroy()
  })
})
