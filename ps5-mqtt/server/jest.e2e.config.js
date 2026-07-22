/** @type {import('ts-jest/dist/types').InitialOptionsTsJest} */
module.exports = {
  preset: "ts-jest",
  testEnvironment: "node",
  testMatch: ["<rootDir>/e2e/**/*.e2e.test.ts"],
  transform: {
    "^.+\\.ts$": [
      "ts-jest",
      {
        tsconfig: "tsconfig.e2e.json",
      },
    ],
  },
  // Real server process + shared broker: run serially, allow generous timeouts.
  maxWorkers: 1,
  testTimeout: 60000,
  collectCoverage: false,
}
