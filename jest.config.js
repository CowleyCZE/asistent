/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/tests'],
  testMatch: ['**/*.spec.ts'],
  moduleNameMapper: {
    '^@nativescript/core$': '<rootDir>/tests/mocks/nativescript-core.mock.ts',
    '^@nativescript/core/(.*)$': '<rootDir>/tests/mocks/nativescript-core.mock.ts'
  },
  setupFilesAfterEnv: ['<rootDir>/tests/setup.ts'],
  collectCoverageFrom: [
    'app/services/**/*.ts',
    '!app/services/**/*.spec.ts'
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'text-summary', 'lcov', 'html'],
  // Cíl: 80%+ – prahy jsou nastaveny konzervativně a budou postupně zvyšovány
  coverageThreshold: {
    global: {
      statements: 70,
      branches: 50,
      functions: 70,
      lines: 70
    }
  },
  verbose: true,
  testTimeout: 10000
};
