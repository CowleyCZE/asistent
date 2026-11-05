# Hlasový Asistent pro Android

Tento projekt je open-source hlasový asistent pro Android. Je postaven na platformě **NativeScript** s použitím **TypeScriptu** a **Tailwind CSS**. Umožňuje uživatelům definovat vlastní hlasové příkazy a mapovat je na konkrétní akce, jako je volání webhooků nebo spouštění úloh v aplikaci Tasker.

## Klíčové funkce

- **Vlastní aktivační fráze:** Nastavte si vlastní "wake word" pro aktivaci asistenta.
- **Správa akcí:** Vytvářejte a spravujte neomezený počet vlastních hlasových příkazů.
- **Podpora Webhooků:** Spouštějte automatizaci v chytré domácnosti (Home Assistant, IFTTT, atd.) voláním libovolné URL adresy.
- **Integrace s Taskerem:** Ovládejte jakoukoliv funkci telefonu spouštěním úloh v populární automatizační aplikaci **Tasker**.
- **Zvuková zpětná vazba:** Volitelné zvukové signály pro lepší interakci.
- **Jednoduché rozhraní:** Přehledné a snadno ovladatelné rozhraní pro nastavení.

---

## Jak to funguje (Architektura)

Aplikace je navržena tak, aby byla co nejefektivnější a reagovala rychle. Zde je zjednodušený popis její vnitřní architektury:

1.  **Detekce aktivační fráze:** Po spuštění aplikace neustále naslouchá v úsporném režimu (`SpeechRecognitionService`). Neanalyzuje vše, co slyší, ale čeká pouze na jednu z vámi definovaných **aktivačních frází** (např. "Hey asistente").

2.  **Rozpoznání příkazu:** Jakmile je aktivační fráze rozpoznána, asistent se přepne do aktivního režimu a nahraje následující větu – váš příkaz.

3.  **Zpracování příkazu:** Rozpoznaný text je předán službě `AssistantService`, která jej porovná se seznamem vašich **akcí**. Hledá shodu mezi vysloveným příkazem a "spouštěcí frází" definovanou u každé akce.

4.  **Provedení akce:** Pokud je nalezena shoda, provede se příslušná akce:
    *   **Webhook:** Zavolá se zadaná URL adresa metodou `POST`. To je ideální pro ovládání chytré domácnosti (např. Home Assistant, IFTTT).
    *   **Tasker:** Odešle se příkaz (Intent) do aplikace Tasker ke spuštění konkrétní úlohy.

5.  **Ukládání nastavení:** Veškerá vaše konfigurace (aktivační fráze, akce, atd.) je trvale uložena přímo v úložišti aplikace na vašem telefonu. K tomu se využívá klíč-hodnota úložiště (`key-value store`) poskytované NativeScriptem (`ApplicationSettings`). To znamená, že vaše data zůstanou zachována i po restartu aplikace.

---

## Technologický stack

Tento projekt využívá následující technologie:

-   **[NativeScript](https://nativescript.org/)**: Framework pro vývoj nativních mobilních aplikací pro iOS a Android z jedné kódové základny.
-   **[TypeScript](https://www.typescriptlang.org/)**: Staticky typovaný nadmnožina JavaScriptu, která zvyšuje robustnost a usnadňuje údržbu kódu.
-   **[Tailwind CSS](https://tailwindcss.com/)**: "Utility-first" CSS framework pro rychlý a efektivní design uživatelského rozhraní.
-   **Android SpeechRecognizer**: Nativní API od Androidu pro převod řeči na text, které zajišťuje vysokou přesnost a efektivitu.

---

## Uživatelská příručka

### První spuštění

Při prvním spuštění vás aplikace požádá o **povolení k přístupu k mikrofonu**. Toto povolení je nezbytné pro rozpoznávání hlasu. Prosím, povolte ho.

Po udělení oprávnění přejde aplikace do pohotovostního režimu. Na hlavní obrazovce uvidíte stav "Čekám na aktivační frázi...".

### Základní použití

1.  **Aktivace asistenta:** Řekněte jednu z aktivačních frází. Výchozí fráze jsou "**Hey asistente**" nebo "**Pomoc**".
2.  **Vyslovení příkazu:** Po aktivační frázi se stav změní na "Poslouchám...". Nyní vyslovte svůj příkaz (např. "rozsviť světlo v obýváku").
3.  **Zpracování:** Asistent rozpozná váš příkaz, provede nastavenou akci a zobrazí výsledek. Poté se opět vrátí do pohotovostního režimu.

### Nastavení aplikace

Na hlavní obrazovce klepněte na tlačítko **"Nastavení"** pro konfiguraci aplikace.

#### 1. Správa akcí

Zde definujete, co má asistent dělat.

-   **Přidání nové akce:**
    1.  **Název:** Pojmenujte si akci (např. "Světla v kuchyni").
    2.  **Spouštěcí fráze:** Napište frázi, kterou chcete akci spustit (např. "rozsviť v kuchyni"). Asistent hledá tuto frázi ve vašem příkazu, takže nemusí být přesná.
    3.  **Typ akce:** Vyberte si jednu ze dvou možností:
        -   **Webhook:** Pro volání webové adresy (URL).
            -   Do pole **"URL adresa webhooku"** vložte celou adresu, která se má zavolat.
        -   **Tasker:** Pro spuštění úlohy ve specifické aplikaci **Tasker**.
            -   Do pole **"Název úlohy v Taskeru"** napište **přesný název** úlohy, jak ji máte pojmenovanou v aplikaci Tasker.
    4.  Klepněte na **"Přidat akci"**.

-   **Seznam akcí:**
    -   Pod formulářem vidíte seznam všech vašich nastavených akcí.
    -   Pro smazání akce klepněte na tlačítko **"Odstranit"** vedle ní.

#### 2. Další nastavení

-   **Aktivační fráze:** Spravujte seznam frází, na které bude asistent reagovat.
-   **Zvuková zpětná vazba:** Zapněte nebo vypněte zvuky, které signalizují začátek a konec nahrávání.

---

## Požadavky

### Integrace s Taskerem

-   Abyste mohli používat akce typu "Tasker", musíte mít na svém telefonu nainstalovanou aplikaci **[Tasker](https://play.google.com/store/apps/details?id=net.dinglisch.android.taskerm)** od vývojáře joaomgcd.
-   V Taskeru musíte povolit externí kontrolu. V menu Taskeru jděte do `Preferences -> Misc -> Allow External Access` a ujistěte se, že je tato volba zaškrtnutá.

---

## Příručka pro vývojáře

Pokud chcete přispět do projektu nebo si aplikaci sami sestavit, postupujte podle následujících kroků.

### Požadavky pro vývoj

-   **[Node.js](https://nodejs.org/)**: Ujistěte se, že máte nainstalovanou aktuální LTS verzi.
-   **NativeScript CLI**: Nainstalujte jej globálně pomocí příkazu:
    ```bash
    npm install -g nativescript
    ```
-   **Android Studio**: Pro nastavení Android SDK a emulátoru. Sledujte oficiální [instrukce pro nastavení NativeScriptu](https://docs.nativescript.org/environment-setup.html#android-setup).

### Instalace a spuštění

1.  **Klonování repozitáře:**
    ```bash
    git clone https://github.com/CowleyCZE/asistent.git
    cd asistent
    ```

2.  **Instalace závislostí:**
    ```bash
    npm install
    ```

3.  **Spuštění na zařízení nebo emulátoru:**
    Připojte své Android zařízení nebo spusťte emulátor a poté spusťte příkaz:
    ```bash
    ns run android
    ```

### Struktura projektu

-   `app/`: Hlavní adresář s veškerým kódem aplikace.
    -   `app-root.xml`: Kořenové zobrazení aplikace.
    -   `main-page.xml` / `main-page.ts`: Hlavní stránka aplikace a její view-model.
    -   `settings-page.xml` / `settings-page.ts`: Stránka s nastavením a její view-model.
    -   `services/`: Oddělená logika pro různé funkce (rozpoznávání řeči, správa nastavení, atd.).
    -   `assets/`: Statické soubory, jako jsou zvuky.
-   `App_Resources/`: Specifické zdroje pro platformu Android (ikony, manifest, atd.).
-   `nativescript.config.ts`: Konfigurační soubor pro NativeScript.
-   `package.json`: Seznam závislostí a skriptů projektu.

---

[Edit in StackBlitz ⚡️][def]

[def]: https://stackblitz.com/~/github.com/CowleyCZE/asistent


---

## 📦 Instalace

### Předpoklady

- **Node.js** 18+ a npm
- **NativeScript CLI 8.3+**: `npm install -g nativescript@8.3.0`
- **Android SDK** (API 33) + Android Studio, nebo jen command-line tools
- Zařízení/emulátor s Androidem (API 26+), povolené ladění USB (`adb devices`)

### Kroky instalace

```bash
# 1. Klonovat repozitář
git clone https://github.com/CowleyCZE/asistent.git
cd asistent

# 2. Nainstalovat závislosti (spustí i setup-nativescript.js)
npm install

# 3. Zkontrolovat prostředí
ns doctor android

# 4. Spustit na připojeném zařízení / emulátoru
ns run android
```

> 💡 **API klíče:** Webhook klíče a další tajemství se konfigurují přes GitHub Secrets v CI (viz `.github/SECRETS.md`). Do repozitře nikdy nevkládejte reálné klíče.

### 📱 Rychlé vyzkoušení bez buildu: `ns preview`

Nejrychlejší způsob, jak aplikaci spustit, je **preview na telefonu** – nepotřebujete Android SDK ani kabel:

```bash
npm install        # pokud ještě nebyly nainstalovány závislosti
ns preview         # ekvivalentně: npm start / npm run preview
```

CLI vytvoří JavaScript bundle, spustí lokální server a v terminálu zobrazí **QR kód**:

1. Nainstalujte aplikaci **NativeScript Preview** z Google Play na telefon.
2. Telefon a počítač musí být na **stejné síti** (preview se synchronizuje přes IP/port).
3. Naskenujte QR kód – aplikace se spustí; změny kódu se následně synchronizují automaticky (HMR).

> Pozn.: Preview aplikace obsahuje plný Android runtime, takže aplikace umí vyžádat oprávnění k mikrofonu, přehrávat zvuky a volat webhooky. Pro plnohodnotné testování (Tasker, notifikace na uzamčené obrazovce) ale doporučujeme `ns run android`, které vytvoří kompletní APK.

### 🤔 Je StackBlitz potřeba?

**Ne.** StackBlitz je pouze online alternativa k lokálnímu vývoji – projekt lze spustit v prohlížeči přes WebContainer, bez instalace čehokoli (tlačítko *Edit in StackBlitz* níže). Soubory `.stackblitzrc`, `setup-nativescript-stackblitz`, `install_nvm.sh` a paměťová ladění v `webpack.config.js` (`devtool = false`, `parallelism = 1`) slouží **pouze** této online cestě; lokálně je CLI ignoruje a stačí Node.js 18+ a `npm install -g nativescript`.

| Prostředí | Co potřebujete | Příkaz |
| --- | --- | --- |
| Lokálně, preview | Node.js 18+, NativeScript CLI, aplikace NS Preview na telefonu | `ns preview` |
| Lokálně, plný běh | navíc Android SDK + zařízení/emulátor s USB laděním | `ns run android` |
| StackBlitz (online) | jen prohlížeč a telefon s aplikací NS Preview | `npm start` (spustí `.stackblitzrc`) |

## 🚀 Příklady použití

### Definice hlasové akce

V nastavení aplikace (Nastavení → Akce) vytvořte akci:

| Pole | Příklad |
| --- | --- |
| Fráze | `rozsvit svetlo v obyvaku` |
| Název | `Světlo obývák` |
| Typ | `webhook` |
| URL | `https://home.example.com/api/light?room=living` |

Stačí říct aktivační frázi (např. *"Asistente"*) a poté příkaz. Asistent příkaz matchne, zavolá webhook a potvrdí hlasem i notifikací.

### Příklad: Tasker úloha

| Pole | Příklad |
| --- | --- |
| Fráze | `zapni televizi` |
| Typ | `tasker` |
| Název úlohy | `TV_ON` |

Požadavek na Tasker musí být na zařízení nainstalovaný a povolený *External Access*.

### Offline režim

Bez připojení se příkazy nevyhazují – ukládají se do fronty (max. 100, priorizované, max. 3 pokusy na příkaz). Jakmile se připojení obnoví, fronta se automaticky zpracuje a dostanete notifikaci s výsledkem.

## 🏗️ Přehled architektury

```text
main-page (lazy view-model)
   └─ MainViewModel ── ServiceLocator ──┐
                                         │  DIContainer (singletony)
        ┌────────────────┬───────────────┼──────────────────┐
        ▼                ▼               ▼                  ▼
 SpeechRecognition  AssistantService  Connectivity     FeedbackService
        │           └─ CommandProcessor (webhook / tasker akce)
        │           └─ OfflineService (prioritní fronta, retry)
        └─ history / statistics / settings / cache / theme / notification / tts / translator / tasker
```

### Použité návrhové vzory

- **Dependency Injection + Service Locator** – služby se vytvářejí lazy přes `DIContainer` (`service-locator.ts), instance jsou singletony; `ServiceLocator.override()` umožňuje v testech dosadit mocky.
- **Constructor Injection** – `AssistantService` přijímá závislosti přes `AssistantServiceDeps`, takže je testovatelný bez Androidu.
- **Singleton** – `serviceLocator`, `serviceRegistry`, `themeService`.
- **Observer (Observable)** – události rozpoznávání řeči (`speechResult`, `wakeWordDetected`) a konektivity (`connectionRestored`).
- **Strategy** – `CommandProcessor` rozhoduje mezi webhookem a Taskerem podle typu akce.
- **Registry + IDisposable** – `serviceRegistry` sbírá služby s metodou `dispose()` a centralizovaně je uvolňuje při ukončení aplikace.
- **Cache-Aside** – `CacheService.withCache()` (TTL cleanup + size-based evikce).
- **Lazy loading** – view-modely stránek i služby se vytvářejí až při prvním použití (`LazyNavigator`).

## 🔧 Build proces

```bash
# Vývojový build + deploy na zařízení
ns run android

# Produkční APK (release konfigurace)
ns build android --env.production
# výstup: platforms/android/app/build/outputs/apk/...

# Unit testy
npm test

# Unit testy s coverage reportem (prahy v jest.config.js)
npm run test:coverage

# E2E testy (Appium + WebdriverIO; vyžaduje APK a spuštěný emulátor/zařízení)
npm run e2e:driver            # instalace UiAutomator2 driveru
APK_PATH=./cesta/k/app.apk npm run e2e
```

CI (GitHub Actions, `.github/workflows/build.yml`) na každý push do `main`:
1. `npm install`
2. **Unit testy s coverage** (`npm test -- --coverage`) – build selže pod prahem coverage
3. Build Android APK
4. Upload APK artefaktu (7 dní)

## 📝 Coding guidelines

- **TypeScript**, NativeScript 8.3, Tailwind CSS pro styly.
- **Žádné magic strings** – klíče úložiště a barvy patří do `app/utils/constants.ts` (`StorageKeys`, `Colors`, `Limits`).
- **DI před statickými importy** – služby získávejte přes `serviceLocator.get(ServiceTokens.X)`, rozhraní (`service-interfaces.ts`) před konkrétními třídami.
- **Validace a error handling** – vstupy sanitizujte přes `Validators` (`app/utils/validation.ts`), síťová volání přes `fetchWithTimeout` + `retryWithBackoff`, chyby logujte přes `ErrorHandler`/`LoggerService`.
- **Naming konvence** (standardizováno, ověřeno proti stavu kódu):
  - Třídy: `PascalCase` + přípona dle role – `OfflineService`, `CommandProcessor`, `DIContainer`, `ServiceLocator`, `LazyNavigator`.
  - Interfejcy: prefix `I` (`ISettingsService`, `service-interfaces.ts`); datové typy bez prefixu (`Action`, `ThemeMode`, `CommandHistory`).
  - Metody, vlastnosti a proměnné: `camelCase`; boolean getry `is*` / `has*` / `are*` (`isOnline()`, `hasNotifications()`, `areAnimationsEnabled()`).
  - Soubory: `kebab-case`; služby s příponou `*.service.ts` (`offline.service.ts`), infrastruktura bez přípony (`di-container.ts`, `service-locator.ts`, `command-processor.ts`), utility v `app/utils/*.ts`.
  - Konstanty: `UPPER_SNAKE_CASE` uvnitř tříd (`REQUEST_TIMEOUT_MS`); exportované objekty konstant `PascalCase` (`StorageKeys`, `Colors`, `Limits`, `ServiceTokens`).
  - Testy: zrcadlí zdrojový soubor – `tests/services/<nazev-sluzby>.service.spec.ts`.
- **JSDoc** pro veřejné metody služeb (krátce: co, parametry, návratová hodnota).
- **Testy**: unit testy v `tests/services/*.spec.ts` (Jest + ts-jest, mocky v `tests/mocks/`), E2E v `tests/e2e/`. Nová služba = nový spec.

## 🛠️ Troubleshooting

| Problém | Řešení |
| --- | --- |
| `ns doctor android` hlásí chyby | Zkontrolujte ANDROID_HOME / ANDROID_SDK_ROOT a nainstalované platformy API 33. |
| Aplikace neslyší mikrofon | Povolte oprávnění MICROPHONE (RECORD_AUDIO) v nastavení Androidu; aplikace si ho žádá při startu. |
| Wake word nereaguje | Ověřte, že je v nastavení správná aktivační fráze a běží detekce (status na hlavní obrazovce). |
| Webhooky nechodí | Ověřte URL (musí být HTTPS), dostupnost endpointu a API klíč; offline příkazy najdete ve frontě (indikátor na hlavní obrazovce). |
| Tasker úlohy se nespouštějí | Tasker musí být nainstalovaný a povolený *External Access*; aplikace to detekuje přes `isTaskerInstalled()`. |
| Notifikace se nezobrazují | Zkontrolujte, že notifikace jsou povolené v nastavení aplikace i systému Android. |
| Offline fronta se nezpracuje | Přejde automaticky při obnově připojení (do 30 s), nebo ručně tlačítkem „Zpracovat" na hlavní obrazovce. |
| `ns preview` – telefon se nepřipojí | Telefon a počítač musí být na stejné síti (firewall/VPN může blokovat port); zkuste `ns preview --no-hmr`, případně ručně zadejte adresu z terminálu do NS Preview aplikace. |
| Testy padají na mock @nativescript/core | Mocky jsou v `tests/mocks/nativescript-core.mock.ts` – nové exporty přidejte tam i do `tests/setup.ts`. |

## ❓ FAQ

**Musí být zařízení rootnuté?** Ne, aplikace používá jen standardní Android API a oprávnění (mikrofon, internet, notifikace).

**Funguje bez internetu?** Ano – příkazy se ukládají do offline fronty a automaticky zpracují po obnově připojení.

**Podporuje iOS?** Zatím ne – viz P4 (iOS podpora) v `opravy-todo.md`.

**Kde se ukládá historie příkazů?** V application storage pod klíči z `StorageKeys` (`command_history_v1`…), posledních 100 položek.

**Jak přidám novou hlasovou akci?** V nastavení aplikace (typ webhook nebo tasker), nebo viz „Příklady použití" výše.

**Jak přispět?** Dodržte coding guidelines, přidejte unit testy a v PR nechte projít CI (testy + coverage + build).

---

*Tato dokumentace odpovídá stavu repo z 4. 11. 2026. Aktuální seznam úkolů najdete v `opravy-todo.md`.*
