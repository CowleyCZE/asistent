# E2E testy (Appium + WebdriverIO)

## Instalace

```bash
npm install
npm run e2e:driver   # instalace UiAutomator2 driveru pro Appium
```

## Sestavení APK

```bash
ns build android --env.production
# nebo debug build:
ns build android
```

## Spuštění testů

```bash
# Cesta k APK lze předat proměnnou APK_PATH (výchozí: platforms/android/app/build/outputs/apk/debug/app-debug.apk)
APK_PATH=./platforms/android/app/build/outputs/apk/debug/app-debug.apk npm run e2e
```

Předpokládá se spuštěný emulátor nebo připojené zařízení s povoleným laděním USB (`adb devices`).

## Struktura

- `wdio.conf.js` – konfigurace WebdriverIO (capability Android + UiAutomator2, appium service)
- `specs/*.e2e.js` – vlastní testy
