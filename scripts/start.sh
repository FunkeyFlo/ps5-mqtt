#!/usr/bin/env bash
set -e

cleanup() {
  yarn workspace @ps5-mqtt/dev-services run stop
}
trap cleanup EXIT INT TERM

yarn workspace @ps5-mqtt/dev-services run start
yarn workspaces foreach -Ap -i --exclude @ps5-mqtt/dev-services run start
