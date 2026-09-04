// Preloaded into every `playactor` child process (NODE_OPTIONS --require, see
// ./client.ts). playactor takes over the keep-alive socket of its sess/ctrl
// request as the Remote Play control channel; Node >= 22.23 destroys a pooled
// keep-alive socket as soon as unsolicited data arrives on it, so `standby`
// silently died on the PS5's first reply. Never pool sockets in this process.
// https://github.com/FunkeyFlo/ps5-mqtt/issues/678
import http from "http"

const OriginalAgent = http.Agent

http.Agent = class extends OriginalAgent {
  constructor(options?: http.AgentOptions) {
    super(options)
    this.removeAllListeners("free")
    this.on("free", () => {})
  }
}
