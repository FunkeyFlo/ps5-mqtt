import { readFileSync, writeFileSync } from "node:fs"
import { join } from "node:path"
import semver from "semver"

const RELEASE_TYPES = {
  MAJOR: "major",
  MINOR: "minor",
  PATCH: "patch",
} as const

const releaseType = process.argv[2]?.toUpperCase() as
  | keyof typeof RELEASE_TYPES
  | undefined

if (!releaseType || !(releaseType in RELEASE_TYPES)) {
  throw new Error(
    `releaseType must be one of ${Object.keys(RELEASE_TYPES).join(", ")}, received "${process.argv[2]}"`,
  )
}

const rootDir = join(__dirname, "..")
const packageJsonPath = join(rootDir, "package.json")
const configYamlPath = join(rootDir, "add-ons", "ps5-mqtt", "config.yaml")

const packageJson = JSON.parse(readFileSync(packageJsonPath, "utf-8"))
const currentVersion = packageJson.version as string
const nextVersion = semver.inc(currentVersion, RELEASE_TYPES[releaseType])

if (!nextVersion) {
  throw new Error(`Unable to increment version "${currentVersion}"`)
}

packageJson.version = nextVersion
writeFileSync(
  packageJsonPath,
  `${JSON.stringify(packageJson, null, 4)}\n`,
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
