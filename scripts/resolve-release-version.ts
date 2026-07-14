/**
 * Resolve the version/tag the release workflow should build, and whether
 * this run is allowed to publish (push images, commit, move the release
 * tag).
 *
 * Two modes, selected by GITHUB_EVENT_NAME:
 *
 *   - "release": the workflow was triggered by publishing a GitHub release.
 *     draft-release.yml already resolved the next version via
 *     release-drafter, so the version/tag come straight from the published
 *     release's tag name. should_publish=true.
 *
 *   - anything else (e.g. workflow_dispatch): there's no release to read a
 *     version from, so bump from merged PR labels the same way
 *     release-drafter would, just to exercise the pipeline end-to-end.
 *     should_publish=false.
 *
 * Environment variables:
 *   GITHUB_EVENT_NAME  Set automatically by Actions.
 *   RELEASE_TAG_NAME   The published release's tag (release mode only).
 *   GITHUB_REF_NAME    Set automatically by Actions; used as the PR base
 *                      branch when resolving labels (dispatch mode only).
 *   GITHUB_TOKEN       Used to query merged PRs via `gh` (dispatch mode only).
 *   GITHUB_OUTPUT      When set, `version`/`tag`/`should_publish` are
 *                       appended in Actions output format.
 */
import { execFileSync } from "node:child_process"
import { readFileSync, writeFileSync } from "node:fs"
import { join } from "node:path"
import semver from "semver"

type ReleaseLevel = "major" | "minor" | "patch"

// Mirrors release-drafter.yml's version-resolver so a manual dispatch bumps
// the same way a real release would.
const LABELS_BY_LEVEL: Record<ReleaseLevel, string[]> = {
  major: ["major", "breaking-change"],
  minor: ["minor", "new-feature", "enhancement", "performance"],
  patch: [
    "patch",
    "bugfix",
    "chore",
    "ci",
    "dependencies",
    "documentation",
    "refactor",
  ],
}

function git(args: string[]): string {
  return execFileSync("git", args, { encoding: "utf-8" }).trim()
}

function resolveFromPublishedRelease(): string {
  const tag = process.env.RELEASE_TAG_NAME
  if (!tag) {
    throw new Error(
      "RELEASE_TAG_NAME must be set when GITHUB_EVENT_NAME=release",
    )
  }
  return tag
}

function lastTagOrEmpty(): string {
  try {
    return git(["describe", "--tags", "--abbrev=0"])
  } catch {
    return ""
  }
}

function mergedSinceTimestamp(lastTag: string): string {
  if (!lastTag) return "1970-01-01T00:00:00Z"
  return git(["log", "-1", "--format=%cI", lastTag])
}

function mergedPrLabels(baseBranch: string, since: string): string[] {
  const output = execFileSync(
    "gh",
    [
      "pr",
      "list",
      "--state",
      "merged",
      "--base",
      baseBranch,
      "--search",
      `merged:>${since}`,
      "--json",
      "labels",
    ],
    { encoding: "utf-8" },
  )
  const prs = JSON.parse(output) as { labels: { name: string }[] }[]
  return prs.flatMap((pr) => pr.labels.map((label) => label.name.toLowerCase()))
}

function resolveLevel(labels: string[]): ReleaseLevel {
  for (const level of ["major", "minor", "patch"] as const) {
    if (LABELS_BY_LEVEL[level].some((label) => labels.includes(label))) {
      return level
    }
  }
  return "patch"
}

function resolveFromMergedPrLabels(): { version: string; tag: string } {
  const lastTag = lastTagOrEmpty()
  const since = mergedSinceTimestamp(lastTag)
  const baseBranch = process.env.GITHUB_REF_NAME
  if (!baseBranch) {
    throw new Error("GITHUB_REF_NAME must be set")
  }

  const labels = mergedPrLabels(baseBranch, since)
  const level = resolveLevel(labels)

  let base = lastTag
  if (!base) {
    const rootDir = join(__dirname, "..")
    const packageJson = JSON.parse(
      readFileSync(join(rootDir, "package.json"), "utf-8"),
    )
    base = `v${packageJson.version}`
    console.log(
      `No reachable git tag; using package.json version as base (${base})`,
    )
  }

  const version = semver.inc(base.replace(/^v/, ""), level)
  if (!version) {
    throw new Error(`Could not compute a ${level} bump from base "${base}"`)
  }

  console.log(`Dry-run dispatch: resolved bump ${level} -> v${version}`)
  return { version, tag: `v${version}` }
}

const isReleaseEvent = process.env.GITHUB_EVENT_NAME === "release"

const { version, tag } = isReleaseEvent
  ? (() => {
      const t = resolveFromPublishedRelease()
      console.log(`Triggered by published release ${t}`)
      return { version: t.replace(/^v/, ""), tag: t }
    })()
  : resolveFromMergedPrLabels()

const shouldPublish = isReleaseEvent

console.log(
  `Resolved version: ${version} (${tag}), should_publish=${shouldPublish}`,
)

const githubOutput = process.env.GITHUB_OUTPUT
if (githubOutput) {
  writeFileSync(
    githubOutput,
    `version=${version}\ntag=${tag}\nshould_publish=${shouldPublish}\n`,
    { flag: "a" },
  )
}
