import { readFileSync, writeFileSync } from "node:fs"
import { join } from "node:path"
import semver from "semver"

const RELEASE_TYPES = ["major", "minor", "patch"] as const
type ReleaseType = (typeof RELEASE_TYPES)[number]

// Accepts either a release level ("major" | "minor" | "patch") or an explicit
// version ("1.5.0" / "v1.5.0"). CI passes the explicit version computed by the
// release workflow's version job so every job agrees on a single version.
const arg = process.argv[2]

if (!arg) {
  throw new Error(
    `A release level (${RELEASE_TYPES.join(", ")}) or explicit version (e.g. 1.5.0) is required`,
  )
}

const rootDir = join(__dirname, "..")
const packageJsonPath = join(rootDir, "package.json")
const configYamlPath = join(rootDir, "add-ons", "ps5-mqtt", "config.yaml")

const packageJson = JSON.parse(readFileSync(packageJsonPath, "utf-8"))
const currentVersion = packageJson.version as string

const explicitVersion = semver.valid(arg.replace(/^v/, ""))
const level = arg.toLowerCase() as ReleaseType

const nextVersion = explicitVersion
  ? explicitVersion
  : RELEASE_TYPES.includes(level)
    ? semver.inc(currentVersion, level)
    : null

if (!nextVersion) {
  throw new Error(
    `Expected a release level (${RELEASE_TYPES.join(", ")}) or a valid semver version, received "${arg}"`,
  )
}

packageJson.version = nextVersion
writeFileSync(
  packageJsonPath,
  `${JSON.stringify(packageJson, null, 2)}\n`,
  "utf-8",
)

const configYaml = readFileSync(configYamlPath, "utf-8")
writeFileSync(
  configYamlPath,
  configYaml.replace(/^version:.*$/m, `version: ${nextVersion}`),
  "utf-8",
)

const githubOutput = process.env.GITHUB_OUTPUT
if (githubOutput) {
  writeFileSync(githubOutput, `version=${nextVersion}\n`, { flag: "a" })
}

console.log(`Bumped version ${currentVersion} -> ${nextVersion}`)
