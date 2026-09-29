import createDebugger from "debug"

const debug = createDebugger("@ha:ps5")

type ShutdownHooks = {
  process?: Pick<NodeJS.Process, "on" | "exit">
  cleanup?: () => Promise<unknown> | unknown
  timeoutMs?: number
}

// Home Assistant (and Docker) stop the add-on by sending SIGTERM. Without a
// handler node dies from the signal itself, giving exit code 143, which the
// Supervisor reports as the add-on being in an "error" state instead of
// "stopped". Handle it and exit cleanly with 0.
export function registerShutdownHandlers({
  process: proc = process,
  cleanup,
  timeoutMs = 5000,
}: ShutdownHooks = {}) {
  let shuttingDown = false

  const shutdown = async (signal: string) => {
    if (shuttingDown) return
    shuttingDown = true
    debug(`Received ${signal}, shutting down`)
    try {
      await Promise.race([
        Promise.resolve(cleanup?.()),
        new Promise((resolve) => setTimeout(resolve, timeoutMs).unref()),
      ])
    } catch (e) {
      debug("Error during shutdown", e)
    }
    proc.exit(0)
  }

  proc.on("SIGTERM", () => void shutdown("SIGTERM"))
  proc.on("SIGINT", () => void shutdown("SIGINT"))
}
