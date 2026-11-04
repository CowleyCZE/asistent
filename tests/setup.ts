// Jest setup file
// @nativescript/core je mockován přes moduleNameMapper v jest.config.js
// (zde nelze volat jest.mock na tentýž modul – vede k rekurzi v resolveru)

// Mock fetch for testing
if (!(global as any).fetch) {
    (global as any).fetch = jest.fn();
}

// Mock console methods to reduce noise in tests
const originalConsoleLog = console.log;
const originalConsoleError = console.error;

beforeAll(() => {
    console.log = jest.fn();
    console.error = jest.fn();
});

afterAll(() => {
    console.log = originalConsoleLog;
    console.error = originalConsoleError;
});

// Reset mocks before each test
beforeEach(() => {
    jest.clearAllMocks();
});
