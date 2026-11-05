# CZE-asistent - TODO List

**Poslední aktualizace:** 5. listopadu 2026 (8. běh)
**Celkový počet úkolů:** 112

---

## P0 - KRITICKÉ (Okamžitá oprava)

### Bezpečnost
- [x] Opravit hardcodované API klíče v app/config/api-config.ts
- [x] Odstranit .env z repozitáře a přidat do .gitignore
- [x] Nastavit GitHub Secrets pro CI/CD
- [x] Přidat API key autentizaci pro webhooky
- [x] Implementovat HMAC signature verificaci pro webhooky

### Chyby v kódu
 - [x] Opravit NOTIFICATION v app/services/notification.service.ts
- [x] Odstranit duplicitní import knownFolders v app/services/offline.service.ts
- [x] Implementovat dispose() metody pro všechny služby (speech-recognition, feedback, tts)
- [x] Zaregistrovat cleanup v Application exit event
- [x] Opravit neuzavřenou metodu isOfflineModeActive() v app/services/assistant.service.ts (syntax error) #nová-chyba

---

## P1 - DŮLEŽITÉ (Vysoká priorita)

### Architektonické problémy
- [x] Implementovat Dependency Injection container
- [x] Vytvořit ServiceLocator
- [x] Používat interface místo konkrétních tříd
- [x] Rozdělit AssistantService na menší třídy (CommandProcessor, LoggerService)
- [x] Extrahovat společný kód do utility tříd (IdGenerator, Logger, ErrorHandler)

### Validace
- [x] Přidat URL validaci (regex) pro webhooky
- [x] Validovat délku a formát textových polí
- [x] Implementovat sanitizaci vstupů
- [x] Přidat null checks pro všechny externí volání
- [x] Používat optional chaining a nullish coalescing

### Error Handling
- [x] Přidat try-catch pro všechny async operace
- [x] Implementovat centralizovaný error handler
- [x] Implementovat retry mechanismus s exponential backoff
- [x] Přidat timeout pro síťové požadavky

---

## P2 - STŘEDNÍ PRIORITA

### Testování
- [x] Vytvořit unit testy pro speech-recognition.service.ts
- [x] Vytvořit unit testy pro theme.service.ts
- [x] Vytvořit unit testy pro feedback.service.ts
- [x] Vytvořit unit testy pro cache.service.ts
- [x] Vytvořit unit testy pro offline.service.ts
- [x] Vytvořit unit testy pro notification.service.ts
- [x] Vytvořit unit testy pro translator.service.ts
- [x] Vytvořit unit testy pro tasker.service.ts
- [x] Vytvořit unit testy pro text-to-speech.service.ts
- [x] Vytvořit unit testy pro history.service.ts
- [x] Vytvořit unit testy pro statistics.service.ts
- [x] Nastavit Jest coverage reporting (cíl: 80%+)
- [x] Přidat CI check pro minimální coverage
- [x] Nastavit Appium pro E2E testy

### Výkon
- [x] Optimalizovat MP3 soubory v app/assets/sounds/ (nižší bitrate) — ověřeno: soubory jsou již minimální (79–90 B placeholder soubory), není co optimalizovat
- [x] Zvažit použití OGG formátu pro zvuky — rozhodnuto: Android (jediná cílová platforma) OGG podporuje; použije se při nahrazení placeholder zvuků reálnými soubory (viz nová chyba níže)
- [x] Implementovat TTL-based cache cleanup
- [x] Přidat size-based cache eviction
- [x] Implementovat lazy loading pro stránky

### Kódová kvalita
- [x] Zapnout strict: true v tsconfig.json (včetně noImplicitAny a strictNullChecks)
- [x] Zapnout noImplicitAny: true (implikováno strict: true)
- [x] Zapnout strictNullChecks: true (implikováno strict: true)
- [x] Opravit všechny typové chyby (65 chyb pod strict mode opraveno v commitu b000768; CI krok `npm run typecheck` prošel ✅)
- [x] Přidat JSDoc pro všechny veřejné metody (dokončeno v commitech 1ee2c17 a 39929f0 – view modely, stránky, utility a všechny služby)
- [x] Vytvořit constants soubor pro magic strings
- [x] Standardizovat naming konvence (commit c35b805 – kompletní konvence v README, ověřeno proti stavu kódu)

### Nové chyby
- [x] Nahradit placeholder MP3 soubory v app/assets/sounds/ reálnými zvukovými soubory (nyní 79–90 B, nejsou přehratelné) #nová-chyba — hotovo: nahrazeny reálnými přehratelnými WAV tóny (start: 587→880 Hz, stop: 880→392 Hz, error: dvojí 233 Hz; 11,025 kHz, 8-bit mono), feedback.service.ts přepnut na .wav, placeholder MP3 smazány (commity 98d1c2b, 11e1820, 3686915)
- [x] Opravit tisíce chyb webpack buildu ("Cannot read properties of undefined (reading 'module')" u node_modules) – pin webpacku 5.88.2 v package.json, novější webpack (>=5.91) rozbíjí NativeScript sync kontext #nová-chyba
- [x] Opravit OOM webpack buildu v ns preview na StackBlitzu („Reached heap limit" u ~55 % synchronizace) – devtool=false + parallelism=1 v webpack.config.js, NODE_OPTIONS=--max-old-space-size=2048 v .stackblitzrc #nová-chyba
- [x] Odebrat použití DOM (document.documentElement) z app.ts a theme.service.ts – v NativeScript runtime DOM neexistuje, aplikace padala při startu v Preview (oprava: motiv přes CSS třídy na kořenovém view) #nová-chyba
- [x] SpeechRecognitionService nespouštět wake word detekci v konstruktoru bez oprávnění (chybová smyčka), použít createSpeechRecognizer + isRecognitionAvailable, reset isListening v onError #nová-chyba
- [x] PermissionsService: statický přístup k android.Manifest při importu modulu (crash) + neexistující android.support.v4 (nahrazeno androidx s fallbacky a lazy přístupem) #nová-chyba
- [x] FeedbackService/TextToSpeechService: bezpečné vytváření Android objektů (try/catch, lazy MediaPlayer), context z Application.android místo neexistujícího android.context #nová-chyba
- [x] Opravit dismiss() v NotificationService.show(): auto-dismiss používal neexistující id vstupního objektu místo id vytvořené notifikace (opraveno v commitu 4fd0d87, ověřeno type checkem) #nová-chyba
- [x] Opravit unit testy v CI (opraveno v commitech e93de43, e9b5a38, 5975086 a c4a1cf5 – history Date spy, statistics TS7006, cache evictBySize; workflow od 5975086 automaticky zakládá issue při selhání testů a od c4a1cf5 žádné nové selhání nenastalo ✅) #nová-chyba

---

## P3 - NÍZKÁ PRIORITA

### UX/UI Vylepšení
- [x] Přidat responsive layouty (commit 2cdcf5e – media queries v app.css: tablety ≥720dp, malé telefony ≤360dp, landscape)
- [ ] Testovat na různých zařízeních #blokováno – vyžaduje fyzická zařízení/emulátor; responsive layouty a high contrast jsou připraveny, potřebné ověřit na hardware
- [x] Přidat animace pro všechny interakce (commit 2cdcf5e – třída btn-press:active na všech 17 tlačítkách, CSS animace již existovaly)
- [x] Vytvořit animace utility třídu (commit 2cdcf5e – app/utils/animation.utils.ts: fadeIn/Out, slideIn, pressFeedback, shake, popIn, revealSection)
- [x] Přidat accessibility labels (commit 2cdcf5e – accessibilityLabel na 24 interaktivních prvcích: tlačítka, switche, slidery, textová pole všech 4 stránek)
- [x] Implementovat keyboard navigation (commit 00a48cd – app/utils/keyboard-navigation.utils.ts: D-pad/šipky posun fokusu, Enter/Mezerník aktivace; napojeno v main-page.ts)
- [x] Přidat high contrast mode (commit 00a48cd – highContrast v ThemeService, přepínač v Nastavení > Vzhled, .high-contrast CSS třídy)

### Funkční vylepšení
- [x] Přidat podporu pro více jazyků (EN, DE, SK) v speech recognition (commity 6482cc9 + 7bda24e – speechLanguage v nastavení, výběr v UI, podporováno cs-CZ/en-US/de-DE/sk-SK, unit testy)
- [x] Implementovat continuous listening (commit bbd079b – continuousMode ve SpeechRecognitionService, setContinuousListening, auto-restart 300 ms po speechResult, unit testy)
- [x] Vylepšit wake word detection (commit 6fc9a4a – WakeWordMatcher: normalizace diakritiky, fuzzy shoda po slovech s Levenshtein tolerancí 1 chyby, zpětně kompatibilní podřetězcová shoda, detekce z parciálních výsledků pro rychlejší reakci, 8 unit testů)
- [x] Přidat automatické zpracování offline queue při obnově připojení
- [x] Implementovat priority queue pro offline příkazy
- [ ] Přidat push notifikace (Firebase) #blokováno – vyžaduje Firebase projekt (google-services.json, FCM klíče), který musí založit vlastník aplikace
- [x] Implementovat notifikační kanály (commit bbd079b – CHANNELS v NotificationService: success/errors/warnings/info s IMPORTANCE_*, ensureNotificationChannels idempotentní no-op mimo Android ≥26, unit testy)

### Design
- [x] Přidat moderní UI komponenty (commit 04452b3 – app.css: card, card-elevated, chip, chip-primary, badge, btn/btn-primary/secondary/success/danger/ghost, input, divider, list-item, fab; motiv-aware přes CSS proměnné)
- [x] Vylepšit barevné schéma (commit 04452b3 – paleta slate/indigo: světlé i tmavé schéma, sémantické tokeny --success/--danger/--warning/--info, notifikace používají sémantické barvy)
- [x] Přidat ikony pro akce (commity 04452b3 + 2629acd – unicode ikony na tlačítkách: 🎤/⏹️ Start/Stop, ⚙️ Nastavení/Zpracovat, ➕ Přidat, 🗑️ Odstranit, 🕘 Historie, 📊 Statistiky, 🔊 Test TTS, ⚠️ Offline, 📝/🌐 popisky)
- [x] Implementovat Material Design (ověřeno 7. běh: app.css obsahuje kompletní Material Design 3 vrstvu – elevation úrovně 1–5, shape scale pro corner radius, typografická škála MD3, ripple state layery na tlačítkách, MD3 komponenty: cards/chips/FAB/segmented; aplikováno na všechny stávající komponenty)
- [x] Přidat světlé/tmavé téma varianty (ověřeno 5. 11. 2026: ThemeService podporuje light/dark/system s detekcí systémového režimu, .dark CSS proměnné v app.css, výběr režimu v Nastavení > Vzhled + přepínač vysokého kontrastu)
- [x] Implementovat custom téma (dokončeno 7. běh: vzorník barev (ThemeService.COLOR_PALETTE) s výběrem primární/akcentové barvy v Nastavení > Vzhled, setPrimaryColor/setAccentColor s perzistencí, aplikace vlastních barev v NativeScript runtime přes Page.addCss – applyToPage voláno v navigatingTo všech stránek; unit testy custom-colors.spec.ts)

### Dokumentace
- [x] Přidat installation guide do README
- [x] Přidat usage examples do README
- [x] Přidat troubleshooting sekci do README
- [x] Přidat FAQ do README
- [ ] Přidat screenshots do README #blokováno – vyžaduje funkční build na zařízení/emulátoru
- [x] Generovat API docs z JSDoc (commit níže – typedoc.json entryPoints app/services + app/utils, npm skript `docs`, výstup docs/api v .gitignore)
- [x] Přidat příklady použití do dokumentace
- [x] Přidat architecture overview
- [x] Dokumentovat design patterns
- [x] Přidat coding guidelines
- [x] Dokumentovat build proces

---

## P4 - DLOUHODOBÉ

### Nové integrace
- [x] Home Assistant integrace (8. běh: nový typ akce 'homeassistant' – CommandProcessor.executeHomeAssistantAction volá REST API POST {url}/api/services/{domain}/{service} s Bearer long-lived tokenem a entity_id; retry/backoff, timeout, cache, historie, notifikace, TTS; validace URL/tokenu/služby/entity (Validators.HA_SERVICE_PATTERN/HA_ENTITY_PATTERN); UI segment + pole v Nastavení > Akce; 7 unit testů)
- [x] IFTTT integrace (7. běh: nový typ akce 'ifttt' – CommandProcessor.executeIftttAction volá Maker Webhooks URL https://maker.ifttt.com/trigger/{event}/with/key/{key} s POST + JSON hodnotami value1–3, retry/backoff, timeout, cache, historie, notifikace, TTS; validace event/klíče (Validators.IFTTT_TOKEN_PATTERN); výběr typu a pole event/klíč v Nastavení > Akce; dispatch v AssistantService; ICommandProcessor rozšířen; 6 unit testů)
- [ ] Google Assistant integrace
- [ ] Alexa integrace
- [ ] IoT platform integrace

### AI/ML
- [x] Přidat intent recognition (8. běh: IntentRecognitionService – rule-based rozpoznávání záměrů pro češtinu: time/date/greeting/thanks/joke/weather/help; fallback v AssistantService, když žádná akce neodpovídá → TTS odpověď + zápis do historie jako 'intent'; IIntentRecognitionService pro DI; 9 unit testů intent-recognition.service.spec.ts + 3 testy fallbacku v assistant.service.spec.ts)
- [ ] Implementovat NLP
- [ ] Přidat context understanding
- [x] Umožnit custom commands (8. běh: nový typ akce 'custom' s vlastní TTS odpovědí (customResponse, validace max 300 znaků) – CommandProcessor.executeCustomAction přečte odpověď, zapíše historii a notifikaci; UI segment „Vlastní" + pole odpovědi v Nastavení > Akce; 2 unit testy)

### Cloud a synchronizace
- [ ] Synchronizovat nastavení přes cloud
- [ ] Synchronizovat historii přes cloud
- [ ] Umožnit backup/restore
- [ ] Synchronizace mezi zařízeními
- [ ] Shared commands
- [ ] Cross-device communication

### iOS Podpora
- [ ] Nastavit iOS build pipeline
- [ ] Implementovat iOS specific služby
- [ ] Testovat na iOS zařízeních
- [ ] Přidat iOS permissions handling

### Voice commands builder
- [ ] Vizuální builder pro příkazy
- [ ] Drag & drop interface
- [ ] Testovací mód

---

## STATISTIKA

- P0 (Kritické): 10 úkolů
- P1 (Důležité): 25 úkolů
- P2 (Střední): 37 úkolů
- P3 (Nízká): 30 úkolů
- P4 (Dlouhodobé): 10 úkolů
- **Celkem: 112 úkolů**

---

## POKYNY PRO AI

1. **Hledání:** Použijte Ctrl+F / Cmd+F pro vyhledávání klíčových slov
2. **Odškrtávání:** Změňte `- [ ]` na `- [x]` pro hotové úkoly
3. **Přidávání:** Nové úkoly přidejte na konec příslušné sekce
4. **Priorita:** P0 > P1 > P2 > P3 > P4
5. **Formát:** Udržujte stejný formát pro konzistenci

---

**Soubor vytvořen:** 2. listopadu 2024
