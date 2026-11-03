// Jest setup file
// Mock @nativescript/core module (celý mock modul, aby zůstal kompatibilní i s budoucími exporty)
jest.mock('@nativescript/core', () => require('./mocks/nativescript-core.mock'));

// Mock fetch for testing
if (!global.fetch) {
    global.fetch = jest.fn();
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
