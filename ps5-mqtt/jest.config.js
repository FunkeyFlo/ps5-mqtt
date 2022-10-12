/** @type {import('ts-jest/dist/types').InitialOptionsTsJest} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  transform: {
    '^.+\\.tsx?$': [
      'ts-jest', {
        tsconfig: 'tsconfig.test.json',
      }
    ]
  },
  collectCoverage: true,
  coveragePathIgnorePatterns: [
    '/node_modules/',
    '/dist/',
  ]
};