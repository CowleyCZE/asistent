# CZE-asistent - TODO List

**Poslední aktualizace:** 5. listopadu 2026 (13. běh – opraveny 3 P2 úkoly: odstraněn cyklický import main-view-model → app.ts (ThemeService nyní přes serviceLocator); odstraněno předčasné applyThemeToRootView() po Application.run() v app.ts; opraven build.yml – JDK 17, platné inputy setup-android, debug build bez --env.production. Částečně řeší konsolidaci služeb: ThemeService je nyní singleton přes serviceLocator ve všech stránkách.)
**Dokument pročištěn:** dokončené úkoly odstraněny (archiv ve starších commitech), zůstávají pouze otevřené a nově nalezené chyby.

---

## P0 - KRITICKÉ (Okamžitá oprava) #nové-chyby

### Chyby v kódu
*(žádné otevřené – poslední dvě P0 opraveny v 10. běhu: bezpečný přístup k process.env v api-config.ts; HMAC přes javax.crypto.Mac v command-processor.ts)*

---

## P1 - DŮLEŽITÉ (Vysoká priorita) #nové-chyby

### Chyby v kódu
*(žádné otevřené – poslední 2 P1 opraveny v 12. běhu: wake word chybová smyčka s backoffem a limitem; TTS speak() listener a unikátní utteranceId. Dříve: 4 opraveny v 11. běhu; isOnline/offline detekce v 10. běhu)*

---

## P2 - STŘEDNÍ PRIORITA #nové-chyby

### Architektura
- [ ] **Zbývající konsolidace mechanismů správy služeb** – *(částečně vyřešeno v 13. běhu: ThemeService je nyní registrován v serviceLocatoru jako singleton; app.ts, main-page.ts i settings-view-model.ts používají jednu sdílenou instanci)* – stále však paralelně existují `serviceRegistry` (cleanup při exitu) a `serviceLocator`/`DIContainer` (DI); konsolidovat na jeden mechanismus (např. dispose() registrace přes serviceLocator, serviceRegistry odebrat). #nová-chyba
- [ ] **DI nekonzistence u služeb** – SpeechRecognitionService, TextToSpeechService, FeedbackService a CommandProcessor si vytvářejí vlastní `new SettingsService()` místo injekce přes serviceLocator; nastavení se pak čte z více instancí stejné služby. Dodělat konzistentní constructor injection (pozor na cyklický import služba → serviceLocator → služba). #nová-chyba

---

## P3 - NÍZKÁ PRIORITA (přeneseno – dosud otevřeneno)

- [ ] Testovat na různých zařízeních #blokováno – vyžaduje fyzická zařízení/emulátor; responsive layouty a high contrast jsou připraveny, potřebné ověřit na hardware
- [ ] Přidat push notifikace (Firebase) #blokováno – vyžaduje Firebase projekt (google-services.json, FCM klíče), který musí založit vlastník aplikace
- [ ] Přidat screenshots do README #blokováno – vyžaduje funkční build na zařízení/emulátoru

---

## P4 - DLOUHODOBÉ (přeneseno – dosud otevřeneno)

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
- P1 (Důležité): 0 (poslední 2 opraveny v 12. běhu; 4 v 11. běhu; isOnline v 10. běhu)
- P2 (Střední): 2 otevřené (3 opraveny v 13. běhu; konsolidace služeb částečně)
- P3 (Nízké): 3 blokované
- P4 (Dlouhodobé): 18 úkolů
- **Celkem otevřeno: 23**

---

## POKYNY PRO AI

1. **Priorita:** P0 > P1 > P2 > P3 > P4
2. **Odškrtávání:** Změňte `- [ ]` na `- [x]` pro hotové úkoly
3. **Úklid:** Dokončené úkoly při aktualizaci dokumentu odstraňte (historie zůstává v gitu)
4. **Přidávání:** Nové úkoly přidejte na konec příslušné sekce s `#nová-chyba`
5. **Formát:** Udržujte stejný formát pro konzistenci

---

**Soubor vytvořen:** 2. listopadu 2024 · **Poslední revize:** 5. listopadu 2026
