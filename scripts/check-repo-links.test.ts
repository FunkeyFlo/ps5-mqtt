import assert from "node:assert/strict"
import { describe, test } from "node:test"

import { findWrongLinks } from "./check-repo-links"

describe("findWrongLinks", () => {
  for (const link of [
    "https://github.com/andrew-codes/ps5-mqtt/",
    "ghcr.io/andrew-codes/ps5-mqtt:latest",
    "https://github.com/someone-else/ps5-mqtt/issues",
    "git@github.com:andrew-codes/ps5-mqtt.git",
    "https://raw.githubusercontent.com/andrew-codes/ps5-mqtt/main/README.md",
    "https://img.shields.io/github/stars/andrew-codes/ps5-mqtt",
    "docker.io/andrew-codes/ps5-mqtt:latest",
  ]) {
    test(`flags a ps5-mqtt repo not owned by FunkeyFlo: ${link}`, () => {
      assert.equal(findWrongLinks(`see ${link} for details`).length, 1)
    })
  }

  for (const link of [
    "https://github.com/FunkeyFlo/ps5-mqtt/",
    "https://github.com/funkeyflo/ps5-mqtt/issues",
    "ghcr.io/funkeyflo/ps5-mqtt:latest",
    "git@github.com:FunkeyFlo/ps5-mqtt.git",
    "https://img.shields.io/github/stars/FunkeyFlo/ps5-mqtt",
    "https://github.com/andrew-codes/home-automation",
    "https://github.com/andrew-codes",
    "https://github.com/sponsors/andrew-codes",
  ]) {
    test(`does not flag a correct or unrelated link: ${link}`, () => {
      assert.deepEqual(findWrongLinks(`see ${link} for details`), [])
    })
  }
})
