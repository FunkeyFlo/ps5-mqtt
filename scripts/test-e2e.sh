#!/usr/bin/env bash
set -euo pipefail

# End-to-end suite: builds the server, boots the dev-services mosquitto broker,
# and runs the e2e tests (which spawn the real built server against that broker
# with a fake `playactor` binary). The broker is always torn down on exit.

cleanup() {
  yarn workspace @ps5-mqtt/dev-services run stop || true
}
trap cleanup EXIT INT TERM

# git preserves the executable bit, but restore it defensively (e.g. after a
# checkout on a filesystem that dropped it).
chmod +x ps5-mqtt/server/e2e/fake-playactor/playactor

# The harness spawns the real built artifact (dist/index.js), so build first.
yarn workspace @ps5-mqtt/server run build

# Bring up the anonymous mosquitto broker on localhost:1883.
yarn workspace @ps5-mqtt/dev-services run start

# Run the e2e tests serially against the real server + real broker.
yarn workspace @ps5-mqtt/server run test/e2e
