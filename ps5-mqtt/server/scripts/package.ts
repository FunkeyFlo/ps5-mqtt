/**
 * Package the built ps5-mqtt application into a `.packaged/` directory that can
 * be copied as-is into the standalone Docker image, and (optionally) build &
 * tag that image.
 *
 * The `.packaged/` directory contains the application tree directly, ready to
 * be copied into the image:
 *
 *   .packaged/
 *   ├── run.sh
 *   ├── server/
 *   │   ├── package.json
 *   │   └── dist/...
 *   └── client/
 *       └── dist/
 *           ├── index.html
 *           ├── client.js
 *           └── img/...
 *
 * `.packaged/` is purely an ephemeral Docker build context: when this script
 * builds the image itself (i.e. `PREPARE_ONLY` is not set), it removes
 * `.packaged/` again afterwards. Leaving the packaged `server/package.json`
 * lying around would otherwise confuse `yarn install`. When `PREPARE_ONLY=1`,
 * the caller is responsible for building the image (and for cleaning up
 * `.packaged/`) immediately afterwards.
 *
 * Environment variables:
 *   IMAGE         Image repository to tag (default: ps5-mqtt)
 *   TAG           Image tag (default: local)
 *   PREPARE_ONLY  When set to "1", only build `.packaged/` and skip docker build
 *   SKIP_BUILD    When set to "1", assume `yarn build` artifacts already exist
 */
import { execFileSync } from "node:child_process"
import { cpSync, existsSync, mkdirSync, rmSync } from "node:fs"
import { join } from "node:path"

const SERVER_DIR = join(__dirname, "..") // ps5-mqtt/server
const APP_DIR = join(SERVER_DIR, "..") // ps5-mqtt
const ROOT_DIR = join(APP_DIR, "..") // repo root
const CLIENT_DIR = join(APP_DIR, "client")
const PACKAGED_DIR = join(SERVER_DIR, ".packaged")

const IMAGE = process.env.IMAGE || "ps5-mqtt"
const TAG = process.env.TAG || "local"

// 1. Ensure the application has been built.
if (process.env.SKIP_BUILD !== "1") {
  console.log("👨‍🏭 Building application (yarn build)...")
  execFileSync("yarn", ["build"], { cwd: ROOT_DIR, stdio: "inherit" })
}

const serverDist = join(SERVER_DIR, "dist", "index.js")
const clientDist = join(CLIENT_DIR, "dist", "client.js")

if (!existsSync(serverDist)) {
  console.error(`❌ Missing ${serverDist}. Run 'yarn build' first.`)
  process.exit(1)
}
if (!existsSync(clientDist)) {
  console.error(`❌ Missing ${clientDist}. Run 'yarn build' first.`)
  process.exit(1)
}

// 2. Assemble the packaged application tree.
console.log(`📦 Assembling ${PACKAGED_DIR}...`)
rmSync(PACKAGED_DIR, { recursive: true, force: true })
mkdirSync(join(PACKAGED_DIR, "server"), { recursive: true })
mkdirSync(join(PACKAGED_DIR, "client"), { recursive: true })

cpSync(join(SERVER_DIR, "run.sh"), join(PACKAGED_DIR, "run.sh"))

cpSync(
  join(SERVER_DIR, "package.json"),
  join(PACKAGED_DIR, "server", "package.json"),
)
cpSync(join(SERVER_DIR, "dist"), join(PACKAGED_DIR, "server", "dist"), {
  recursive: true,
})

cpSync(join(CLIENT_DIR, "dist"), join(PACKAGED_DIR, "client", "dist"), {
  recursive: true,
})

console.log(`✅ Packaged application tree ready at ${PACKAGED_DIR}`)

// 3. Optionally build the standalone image for the host architecture.
if (process.env.PREPARE_ONLY === "1") {
  process.exit(0)
}

try {
  console.log(`🏭 Building standalone image ${IMAGE}:${TAG}...`)
  execFileSync(
    "docker",
    [
      "build",
      "-t",
      `${IMAGE}:${TAG}`,
      "-f",
      join(SERVER_DIR, "Dockerfile"),
      SERVER_DIR,
    ],
    { stdio: "inherit" },
  )
  console.log(`✅ Built ${IMAGE}:${TAG}`)
} finally {
  rmSync(PACKAGED_DIR, { recursive: true, force: true })
}
