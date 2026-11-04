# CZE-asistent - TODO List

**Poslední aktualizace:** 4. listopadu 2026 (5. běh, pokračování)
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
- [ ] Nahradit placeholder MP3 soubory v app/assets/sounds/ reálnými zvukovými soubory (nyní 79–90 B, nejsou přehratelné) #nová-chyba
- [x] Opravit dismiss() v NotificationService.show(): auto-dismiss používal neexistující id vstupního objektu místo id vytvořené notifikace (opraveno v commitu 4fd0d87, ověřeno type checkem) #nová-chyba
- [x] Opravit unit testy v CI (opraveno v commitech e93de43, e9b5a38, 5975086 a c4a1cf5 – history Date spy, statistics TS7006, cache evictBySize; workflow od 5975086 automaticky zakládá issue při selhání testů a od c4a1cf5 žádné nové selhání nenastalo ✅) #nová-chyba

---

## P3 - NÍZKÁ PRIORITA

### UX/UI Vylepšení
- [x] Přidat responsive layouty (commit 2cdcf5e – media queries v app.css: tablety ≥720dp, malé telefony ≤360dp, landscape)
- [ ] Testovat na různých zařízeních
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
- [ ] Přidat push notifikace (Firebase)
- [x] Implementovat notifikační kanály (commit bbd079b – CHANNELS v NotificationService: success/errors/warnings/info s IMPORTANCE_*, ensureNotificationChannels idempotentní no-op mimo Android ≥26, unit testy)

### Design
- [ ] Přidat moderní UI komponenty
- [ ] Vylepšit barevné schéma
- [ ] Přidat ikony pro akce
- [ ] Implementovat Material Design
- [ ] Přidat světlé/tmavé téma varianty
- [ ] Implementovat custom téma

### Dokumentace
- [x] Přidat installation guide do README
- [x] Přidat usage examples do README
- [x] Přidat troubleshooting sekci do README
- [x] Přidat FAQ do README
- [ ] Přidat screenshots do README
- [x] Generovat API docs z JSDoc (commit níže – typedoc.json entryPoints app/services + app/utils, npm skript `docs`, výstup docs/api v .gitignore)
- [x] Přidat příklady použití do dokumentace
- [x] Přidat architecture overview
- [x] Dokumentovat design patterns
- [x] Přidat coding guidelines
- [x] Dokumentovat build proces

---

## P4 - DLOUHODOBÉ

### Nové integrace
- [ ] Home Assistant integrace
- [ ] IFTTT integrace
- [ ] Google Assistant integrace
- [ ] Alexa integrace
- [ ] IoT platform integrace

### AI/ML
- [ ] Přidat intent recognition
- [ ] Implementovat NLP
- [ ] Přidat context understanding
- [ ] Umožnit custom commands

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

