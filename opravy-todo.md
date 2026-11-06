# CZE-asistent - TODO List

**Poslední aktualizace:** 5. listopadu 2026 (14. běh – dokončeny zbývající 2 P2 úkoly: 1) DI konzistence – SpeechRecognitionService, TextToSpeechService a AssistantService (→ CommandProcessor) dostávají sdílenou SettingsService injekcí přes serviceLocator; 2) konsolidace mechanismů správy služeb – služby se již samy neregistrují do serviceRegistry, registraci IDisposable singletonů provádí centrálně ServiceLocator.get(); settings-view-model používá služby výhradně přes serviceLocator. P2 je tím vyčerpáno.)
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

*(žádné otevřené – poslední 2 opraveny v 14. běhu: DI konzistence (constructor injection + sdílená SettingsService přes serviceLocator) a konsolidace cleanup registrace do ServiceLocator.get(). Dříve: 3 opraveny v 13. běhu: cyklický import main-view-model → app.ts; předčasné applyThemeToRootView() v app.ts; build.yml (JDK 17, platné inputy, debug build bez --env.production).)*

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
- P2 (Střední): 0 (poslední 2 opraveny v 14. běhu; 3 v 13. běhu; konsolidace částečně i v 13. běhu)
- P3 (Nízké): 3 blokované
- P4 (Dlouhodobé): 18 úkolů
- **Celkem otevřeno: 21** (z toho 3 blokované externími závislostmi)

---

## POKYNY PRO AI

1. **Priorita:** P0 > P1 > P2 > P3 > P4
2. **Odškrtávání:** Změňte `- [ ]` na `- [x]` pro hotové úkoly
3. **Úklid:** Dokončené úkoly při aktualizaci dokumentu odstraňte (historie zůstává v gitu)
4. **Přidávání:** Nové úkoly přidejte na konec příslušné sekce s `#nová-chyba`
5. **Formát:** Udržujte stejný formát pro konzistenci

---

**Soubor vytvořen:** 2. listopadu 2024 · **Poslední revize:** 5. listopadu 2026
