import { EventEmitter } from "events"

import { registerShutdownHandlers } from "../shutdown"

function fakeProcess() {
  const emitter = new EventEmitter()
  const exit = jest.fn()
  return {
    emit: (s: string) => emitter.emit(s),
    proc: {
      on: emitter.on.bind(emitter),
      exit,
    } as unknown as NodeJS.Process,
    exit,
  }
}

describe("registerShutdownHandlers", () => {
  test.each(["SIGTERM", "SIGINT"])(
    "%s runs cleanup and exits with code 0 (not signal exit code)",
    async (signal) => {
      const { proc, emit, exit } = fakeProcess()
      const cleanup = jest.fn().mockResolvedValue(undefined)
      registerShutdownHandlers({ process: proc, cleanup })

      emit(signal)
      await new Promise((r) => setImmediate(r))

      expect(cleanup).toHaveBeenCalledTimes(1)
      expect(exit).toHaveBeenCalledWith(0)
    },
  )

  test("still exits 0 when cleanup throws or hangs", async () => {
    const a = fakeProcess()
    registerShutdownHandlers({
      process: a.proc,
      cleanup: () => {
        throw new Error("boom")
      },
    })
    a.emit("SIGTERM")
    await new Promise((r) => setImmediate(r))
    expect(a.exit).toHaveBeenCalledWith(0)

    const b = fakeProcess()
    registerShutdownHandlers({
      process: b.proc,
      cleanup: () => new Promise(() => {}),
      timeoutMs: 10,
    })
    b.emit("SIGTERM")
    await new Promise((r) => setTimeout(r, 50))
    expect(b.exit).toHaveBeenCalledWith(0)
  })

  test("only shuts down once for repeated signals", async () => {
    const { proc, emit, exit } = fakeProcess()
    const cleanup = jest.fn()
    registerShutdownHandlers({ process: proc, cleanup })
    emit("SIGTERM")
    emit("SIGINT")
    await new Promise((r) => setImmediate(r))
    expect(cleanup).toHaveBeenCalledTimes(1)
    expect(exit).toHaveBeenCalledTimes(1)
  })
})
