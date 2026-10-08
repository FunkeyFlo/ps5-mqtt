/**
 * Fail if any tracked file, or any extra path passed as an argument (e.g. a
 * built client bundle), links to a ps5-mqtt repository or container image that
 * is not owned by FunkeyFlo. This guards against forks or old owners leaking
 * into the UI, add-on metadata or docs (see issue #689).
 *
 * Usage:
 *   yarn check-repo-links [extra-file-or-dir ...]
 *
 * Generated and vendored files are skipped: CHANGELOG.md (auto-generated from
 * release notes), the yarn cache/PnP files and lockfile.
 */
import { execFileSync } from "node:child_process"
import { readdirSync, readFileSync, statSync } from "node:fs"
import { join, resolve } from "node:path"

const ROOT_DIR = resolve(__dirname, "..")
const OWNER = "funkeyflo"
const REPO_LINK = /(github\.com|ghcr\.io)\/([A-Za-z0-9_.-]+)\/ps5-mqtt\b/gi

const SKIPPED = [
  /^\.yarn\//,
  /^\.pnp\./,
  /^yarn\.lock$/,
  /(^|\/)CHANGELOG\.md$/,
]

export function findWrongLinks(content: string): string[] {
  return [...content.matchAll(REPO_LINK)]
    .filter((match) => match[2].toLowerCase() !== OWNER)
    .map((match) => match[0])
}

function listTrackedFiles(): string[] {
  return execFileSync("git", ["ls-files", "-z"], {
    cwd: ROOT_DIR,
    encoding: "utf8",
    maxBuffer: 64 * 1024 * 1024,
  })
    .split("\0")
    .filter((file) => file && !SKIPPED.some((skip) => skip.test(file)))
    .map((file) => join(ROOT_DIR, file))
}

function listFiles(path: string): string[] {
  if (!statSync(path).isDirectory()) {
    return [path]
  }
  return readdirSync(path).flatMap((entry) => listFiles(join(path, entry)))
}

function main() {
  const files = [
    ...listTrackedFiles(),
    ...process.argv.slice(2).flatMap((path) => listFiles(resolve(path))),
  ]

  let failures = 0
  for (const file of files) {
    let content: string
    try {
      content = readFileSync(file, "utf8")
    } catch {
      continue
    }
    for (const link of findWrongLinks(content)) {
      console.error(`❌ ${file}: ${link}`)
      failures++
    }
  }

  if (failures > 0) {
    console.error(
      `\nFound ${failures} link(s) to a ps5-mqtt repo/image not owned by FunkeyFlo.`,
    )
    process.exit(1)
  }
  console.log(`✅ ${files.length} files checked, no wrong repository links`)
}

if (require.main === module) {
  main()
}
