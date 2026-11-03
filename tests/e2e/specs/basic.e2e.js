// Základní E2E test – ověří, že aplikace startuje bez pádu.
// Před spuštěním je potřeba APK:  APK_PATH=./cesta/k/apk npm run e2e
describe('CZE-asistent E2E', () => {
    it('aplikace se spustí a běží v nativním kontextu', async () => {
        const context = await driver.getContext();
        if (!context) {
            throw new Error('Aplikace se nespustila – kontext je prázdný');
        }
    });

    it('aktuální aktivita je definovaná', async () => {
        const activity = await driver.getCurrentActivity();
        if (!activity) {
            throw new Error('Aktuální aktivita není definovaná');
        }
    });
});
