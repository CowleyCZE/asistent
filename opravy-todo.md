# CZE-asistent - TODO List

**Poslední aktualizace:** 5. listopadu 2026 (10. běh – opraveny obě P0 chyby a P1 offline detekce)
**Dokument pročištěn:** dokončené úkoly odstraněny (archiv ve starších commitech), zůstávají pouze otevřené a nově nalezené chyby.

---

## P0 - KRITICKÉ (Okamžitá oprava) #nové-chyby

### Chyby v kódu
*(žádné otevřené – poslední dvě P0 opraveny v 10. běhu: bezpečný přístup k process.env v api-config.ts; HMAC přes javax.crypto.Mac v command-processor.ts)*

---

## P1 - DŮLEŽITÉ (Vysoká priorita) #nové-chyby

### Chyby v kódu
- [ ] **IFTTT akce se ukládají do offline fronty, ale fronta umí zpracovat jen webhook/tasker** – v offline režimu se ifttt akce zařadí do fronty bez `actionUrl`/`actionTaskName`; `OfflineService.processNextCommand` pro ni nic neprovede, opakovaně selže a po 3 pokusech visí ve frontě navždy (neprovede se, ale ani nezmizí). Oprava: ifttt do fronty neukládat (stejně jako HA/custom) nebo frontu rozšířit o zpracování ifttt. #nová-chyba
- [ ] **OfflineService.processNextCommand dvojité navyšování pokusů** – `command.attempts++` se provádí před try i znovu v catch bloku; při výjimce se pokus započítá dvakrát (příkaz „vyčerpá" 3 pokusy po jediné výjimce). #nová-chyba
- [ ] **Cache webhook/IFTTT odpovědí blokuje opakované spuštění akce** – úspěšná odpověď se cachuje na 5 minut podle URL (`getWebhookCache`/`setWebhookCache`). Opakovaný hlasový příkaz pro tutéž akci do 5 minut se NEPROVEDE, jen se hlásí success (u IFTTT i `executeWebhookAction`/`executeWebhookUrl`). Pro hlasové triggery je to funkční chyba – cache používat jen pro GET / read-only endpointy nebo výrazně zkrátit TTL a přidat parametr času do klíče. #nová-chyba
- [ ] **PermissionsService.requestPermission: Promise bez timeoutu a leak listeneru** – pokud systémový dialog nikdy nevrátí výsledek („Don't ask again", dialog přerušený), Promise visí navždy a event listener zůstává zaregistrovaný. Přidat timeout a `off()` v `finally`. #nová-chyba
- [ ] **Wake word smyčka bez omezení chyb** – `onError` v continuousListening režimu automaticky restartuje poslech po 1 s bez ohledu na typ chyby a bez maximálního počtu pokusů/backoffu (trvalá chyba jako RECOGNIZER_BUSY nebo INSUFFICIENT_PERMISSIONS → tichá nekonečná smyčka, drenž baterie). #nová-chyba
- [ ] **TTS speak(): listener nepřipojen a předčasné resolve** – `UtteranceProgressListener` se vytvoří, ale nikdy nepřipojí přes `setOnUtteranceProgressListener`; `resolve(true)` se volá okamžitě po `speak()`, takže promise nečeká dokončení řeči; všichni používají pevné `'utterance_id'`. Následek: překrývání/míchání TTS odpovědí a nespolehlivé await. #nová-chyba

---

## P2 - STŘEDNÍ PRIORITA #nové-chyby

### Architektura
- [ ] **Cyklický import: main-view-model.ts → ./app (themeService)** – main-view-model importuje `themeService` z `app.ts`, přičemž app.ts spouští aplikaci, která načítá main-page → main-view-model. Import se v kodu nepoužívá (mrtvý import) – odstranit, tím přejde i riziko cyklické závislosti. #nová-chyba
- [ ] **Tři paralelní mechanismy správy služeb** – `serviceRegistry` (singleton cleanup), `serviceLocator`/`DIContainer` (DI) a přímé `new` v konstruktorech služeb. Navíc `ThemeService` se vytváří `new` nezávisle na 3+ místech (app.ts, main-page.ts, settings-view-model.ts), takže motiv aplikují různé instance. Konsolidovat: jeden mechanismus, ThemeService do serviceLocator. #nová-chyba
- [ ] **app.ts volá `applyThemeToRootView()` bezprostředně po `Application.run()`** – kořenový view v tu chvíli ještě nemusí existovat (proto je tam i druhé volání na launchEvent). První volání je nespolehlivé/zbytečné – odstranit jej. #nová-chyba
- [ ] **DI nekonzistence u služeb** – SpeechRecognitionService, TextToSpeechService, FeedbackService a CommandProcessor si vytvářejí vlastní `new SettingsService()` místo injekce přes serviceLocator; nastavení se pak čte z více instancí stejné služby. Dodělat konzistentní constructor injection. #nová-chyba

### CI/CD
- [ ] **build.yml nesrovnalosti** – krok „Build Android APK (Debug)" spouští `ns build android --env.production`; akce `android-actions/setup-android` nemá inputy `android-version`/`ndk-version`/`cmake-version`/`build-tools-version` (tichá se ignorují, verze tedy nejsou garantované); chybí explicitní instalace JDK 17, na které NativeScript 8.3 závisí. #nová-chyba

---

## P3 - NÍZKÁ PRIORITA (přeneseno – dosud otevřeneno)

- [ ] Testovat na různých zařízeních #blokováno – vyžaduje fyzická zařízení/emulátor; responsive layouty a high contrast jsou připraveny, potřebné ověřit na hardware
- [ ] Přidat push notifikace (Firebase) #blokováno – vyžaduje Firebase projekt (google-services.json, FCM klíče), který musí založit vlastník aplikace
- [ ] Přidat screenshots do README #blokováno – vyžaduje funkční build na zařízení/emulátoru

---

## P4 - DLOUHODOBÉ (přeneseno – dosud otevřené)

### Nové integrace
- [ ] Google Assistant integrace
- [ ] Alexa integrace
- [ ] IoT platform integrace

### AI/ML
- [ ] Implementovat NLP
- [ ] Přidat context understanding

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

- P0 (Kritické): 0 (2 opraveny v 10. běhu)
- P1 (Důležité): 6 otevřených (1 opravena v 10. běhu: isOnline/offline detekce)
- P2 (Střední): 5 otevřených
- P3 (Nízká): 3 blokované
- P4 (Dlouhodobé): 20 úkolů
- **Celkem otevřeno: 34**

---

## POKYNY PRO AI

1. **Priorita:** P0 > P1 > P2 > P3 > P4
2. **Odškrtávání:** Změňte `- [ ]` na `- [x]` pro hotové úkoly
3. **Úklid:** Dokončené úkoly při aktualizaci dokumentu odstraňte (historie zůstává v gitu)
4. **Přidávání:** Nové úkoly přidejte na konec příslušné sekce s `#nová-chyba`
5. **Formát:** Udržujte stejný formát pro konzistenci

---

**Soubor vytvořen:** 2. listopadu 2024 · **Poslední revize:** 5. listopadu 2026
