/**
 * Publish the standalone ps5-mqtt image to a container registry.
 *
 * This builds a multi-arch image (using `docker buildx`) directly from the
 * packaged application tree produced by package.ts and pushes it under one or
 * more tags. The caller is responsible for logging in to the registry
 * beforehand (e.g. `docker login ghcr.io`).
 *
 * `.packaged/` is an ephemeral Docker build context: it is removed again once
 * the image has been built & pushed, so a stray `server/package.json` doesn't
 * confuse `yarn install`.
 *
 * Environment variables:
 *   REGISTRY    Registry host (default: ghcr.io)
 *   OWNER       Registry namespace/owner (required, e.g. funkeyflo)
 *   IMAGE       Image name (default: ps5-mqtt)
 *   TAGS          Space- or comma-separated list of tags (default: latest)
 *   PLATFORMS     buildx platforms (default: linux/amd64,linux/arm64)
 *   SKIP_PACKAGE  When "1", use an existing `.packaged/` tree instead of
 *                 rebuilding it (e.g. a CI artifact shared across jobs)
 *   DRY_RUN       When "1", build the image but don't push it
 */
import { execFileSync } from "node:child_process"
import { existsSync, rmSync } from "node:fs"
import { join } from "node:path"

const SERVER_DIR = join(__dirname, "..") // ps5-mqtt/server
const PACKAGED_DIR = join(SERVER_DIR, ".packaged")

const REGISTRY = process.env.REGISTRY || "ghcr.io"
const IMAGE = process.env.IMAGE || "ps5-mqtt"
const TAGS = process.env.TAGS || "latest"
const PLATFORMS = process.env.PLATFORMS || "linux/amd64,linux/arm64"

// Container registries (GHCR in particular) require lowercase namespaces,
// while GitHub owner names may be mixed case (e.g. FunkeyFlo).
const OWNER = process.env.OWNER?.toLowerCase()
if (!OWNER) {
  console.error("❌ OWNER is required (e.g. OWNER=funkeyflo).")
  process.exit(1)
}

const REPO = `${REGISTRY}/${OWNER}/${IMAGE}`

// Build the packaged application tree (no local single-arch image build),
// unless the caller already provided one (SKIP_PACKAGE=1).
if (process.env.SKIP_PACKAGE === "1") {
  if (!existsSync(PACKAGED_DIR)) {
    console.error(`❌ SKIP_PACKAGE=1 but ${PACKAGED_DIR} does not exist.`)
    process.exit(1)
  }
} else {
  execFileSync("tsx", [join(__dirname, "package.ts")], {
    stdio: "inherit",
    env: { ...process.env, PREPARE_ONLY: "1" },
  })
}

const tagArgs = TAGS.split(/[ ,]+/)
  .filter(Boolean)
  .flatMap((tag) => ["--tag", `${REPO}:${tag}`])

const dryRun = process.env.DRY_RUN === "1"

try {
  console.log(
    `🚀 ${dryRun ? "Building (dry run, no push)" : "Publishing"} ${REPO} [${TAGS}] for ${PLATFORMS}...`,
  )
  execFileSync(
    "docker",
    [
      "buildx",
      "build",
      "--platform",
      PLATFORMS,
      ...tagArgs,
      ...(dryRun ? [] : ["--push"]),
      "-f",
      join(SERVER_DIR, "Dockerfile"),
      SERVER_DIR,
    ],
    { stdio: "inherit" },
  )

  console.log(
    dryRun
      ? `✅ Built ${REPO} [${TAGS}] (dry run, not pushed)`
      : `✅ Published ${REPO} [${TAGS}]`,
  )
} finally {
  rmSync(PACKAGED_DIR, { recursive: true, force: true })
}
