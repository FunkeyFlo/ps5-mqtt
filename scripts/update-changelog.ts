import { readFileSync, writeFileSync } from "node:fs"
import { join } from "node:path"

const version = process.argv[2]
const releaseNotes = process.env.RELEASE_NOTES

if (!version) {
  throw new Error("A version must be provided as the first argument")
}

if (!releaseNotes) {
  throw new Error("The RELEASE_NOTES environment variable must be set")
}

const rootDir = join(__dirname, "..")
const changelogPath = join(rootDir, "add-ons", "ps5-mqtt", "CHANGELOG.md")

const date = new Date().toISOString().slice(0, 10)
const entry = `## ${version} - ${date}\n\n${releaseNotes.trim()}\n`

const changelog = readFileSync(changelogPath, "utf-8")
writeFileSync(changelogPath, `${entry}\n${changelog}`, "utf-8")

console.log(`Added changelog entry for version ${version}`)
