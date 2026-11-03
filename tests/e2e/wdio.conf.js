// WebdriverIO konfigurace pro Appium E2E testy (Android)
exports.config = {
    runner: 'local',
    specs: ['./tests/e2e/specs/**/*.js'],
    exclude: [],
    maxInstances: 1,
    capabilities: [
        {
            platformName: 'Android',
            'appium:automationName': 'UiAutomator2',
            'appium:app': process.env.APK_PATH || './platforms/android/app/build/outputs/apk/debug/app-debug.apk',
            'appium:noReset': true,
            'appium:newCommandTimeout': 120
        }
    ],
    logLevel: 'warn',
    bail: 0,
    waitforTimeout: 10000,
    connectionRetryTimeout: 120000,
    connectionRetryCount: 3,
    services: ['appium'],
    framework: 'mocha',
    reporters: ['spec'],
    mochaOpts: {
        ui: 'bdd',
        timeout: 60000
    }
};
