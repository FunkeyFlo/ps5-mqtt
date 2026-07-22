import fs from "fs"
import path from "path"

export type PlayactorSubcommand = "wake" | "standby" | "check"

export interface PlayactorResponse {
  exitCode?: number
  stdout?: string
  stderr?: string
}

export interface Invocation {
  subcommand: string
  argv: string[]
}

/**
 * Configure the response the fake `playactor` returns for a given subcommand.
 * Written before publishing the MQTT command that triggers the invocation.
 */
export function setFixture(
  fixtureDir: string,
  subcommand: PlayactorSubcommand,
  response: PlayactorResponse,
): void {
  fs.writeFileSync(
    path.join(fixtureDir, `${subcommand}.json`),
    JSON.stringify({ exitCode: 0, stdout: "", stderr: "", ...response }),
  )
}

/** Read every fake-playactor invocation recorded so far, in call order. */
export function readInvocations(fixtureDir: string): Invocation[] {
  const logPath = path.join(fixtureDir, "invocations.log")
  if (!fs.existsSync(logPath)) {
    return []
  }
  return fs
    .readFileSync(logPath, "utf-8")
    .split("\n")
    .filter(Boolean)
    .map((line) => JSON.parse(line) as Invocation)
}
