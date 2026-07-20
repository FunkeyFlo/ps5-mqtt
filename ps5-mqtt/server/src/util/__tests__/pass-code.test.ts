import { buildPassCodeArg } from "../pass-code"

describe("buildPassCodeArg", () => {
  test("returns an empty string when no passcode is provided", () => {
    expect(buildPassCodeArg(undefined)).toBe("")
    expect(buildPassCodeArg("")).toBe("")
    expect(buildPassCodeArg("   ")).toBe("")
  })

  test("builds a quoted --pass-code fragment for a numeric passcode", () => {
    expect(buildPassCodeArg("2292")).toBe(" --pass-code '2292'")
  })

  test("trims surrounding whitespace", () => {
    expect(buildPassCodeArg("  2292 ")).toBe(" --pass-code '2292'")
  })

  test("supports a space-separated string of key names", () => {
    expect(buildPassCodeArg("up up down down")).toBe(
      " --pass-code 'up up down down'",
    )
  })

  test("rejects values with shell metacharacters (injection guard)", () => {
    expect(() => buildPassCodeArg("2292; rm -rf /")).toThrow()
    expect(() => buildPassCodeArg("$(whoami)")).toThrow()
    expect(() => buildPassCodeArg("2292'")).toThrow()
  })
})
