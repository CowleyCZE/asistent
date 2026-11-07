import { mockReset } from '../mocks/application-settings.mock';
import { TextToSpeechService } from '../../app/services/text-to-speech.service';

describe('TextToSpeechService', () => {
    let service: TextToSpeechService;

    beforeEach(() => {
        mockReset();
        (global as any).android = undefined;
        service = new TextToSpeechService();
    });

    it('getConfig vrací kompletní konfiguraci', () => {
        const config = service.getConfig();
        expect(typeof config.enabled).toBe('boolean');
        expect(typeof config.language).toBe('string');
        expect(typeof config.pitch).toBe('number');
        expect(typeof config.rate).toBe('number');
        expect(config.volume).toBe(1.0);
    });

    it('setEnabled přepne stav', () => {
        const before = service.isEnabled();
        service.setEnabled(!before);
        expect(service.isEnabled()).toBe(!before);
    });

    it('setLanguage uloží jazyk', () => {
        service.setLanguage('en-US');
        expect(service.getConfig().language).toBe('en-US');
    });

    it('setPitch omezí hodnotu na rozsah 0.5–2.0', () => {
        service.setPitch(3);
        expect(service.getConfig().pitch).toBe(2.0);
        service.setPitch(0.1);
        expect(service.getConfig().pitch).toBe(0.5);
        service.setPitch(1.25);
        expect(service.getConfig().pitch).toBe(1.25);
    });

    it('setRate omezí hodnotu na rozsah 0.5–2.0', () => {
        service.setRate(10);
        expect(service.getConfig().rate).toBe(2.0);
        service.setRate(0.1);
        expect(service.getConfig().rate).toBe(0.5);
    });

    it('speak vrací false, když TTS není inicializované', async () => {
        expect(await service.speak('ahoj')).toBe(false);
    });

    it('speak předá unikátní utteranceId a vyřeší se po onDone', async () => {
        // Simulace Android TTS API (jen části používané v speak())
        const seenIds: string[] = [];
        (global as any).android = {
            os: { Bundle: function (this: any) { this.putInt = () => {}; } }, // this: any – jinak TS odvodí typ bez putInt
            media: { AudioManager: { STREAM_MUSIC: 3 } },
            speech: { tts: { TextToSpeech: {
                QUEUE_FLUSH: 0,
                Engine: { KEY_PARAM_STREAM: 'stream' }
            } } }
        };
        (service as any).isInitialized = true;
        (service as any).ttsEngine = {
            speak: (_text: string, _q: number, _p: any, utteranceId: string) => {
                seenIds.push(utteranceId);
                // simulace dokončení čtení
                setTimeout(() => (service as any).finishUtterance(utteranceId, true), 0);
                return 0;
            }
        };
        service.setEnabled(true);

        const ok = await service.speak('ahoj');
        expect(ok).toBe(true);
        expect(seenIds.length).toBe(1);

        // Unikátní ID pro každé čtení (dříve pevný 'utterance_id')
        const ok2 = await service.speak('světe');
        expect(ok2).toBe(true);
        expect(seenIds.length).toBe(2);
        expect(seenIds[0]).not.toBe(seenIds[1]);

        delete (global as any).android;
    });

    it('speak se vyřeší false při chybě enginu (onError)', async () => {
        (global as any).android = {
            os: { Bundle: function (this: any) { this.putInt = () => {}; } }, // this: any – jinak TS odvodí typ bez putInt
            media: { AudioManager: { STREAM_MUSIC: 3 } },
            speech: { tts: { TextToSpeech: {
                QUEUE_FLUSH: 0,
                Engine: { KEY_PARAM_STREAM: 'stream' }
            } } }
        };
        (service as any).isInitialized = true;
        (service as any).ttsEngine = {
            speak: (_text: string, _q: number, _p: any, utteranceId: string) => {
                setTimeout(() => (service as any).finishUtterance(utteranceId, false), 0);
                return 0;
            }
        };
        service.setEnabled(true);

        expect(await service.speak('ahoj')).toBe(false);

        delete (global as any).android;
    });

    it('speak se vyřeší false, když engine odmítne zařadit do fronty', async () => {
        (global as any).android = {
            os: { Bundle: function (this: any) { this.putInt = () => {}; } }, // this: any – jinak TS odvodí typ bez putInt
            media: { AudioManager: { STREAM_MUSIC: 3 } },
            speech: { tts: { TextToSpeech: {
                QUEUE_FLUSH: 0,
                Engine: { KEY_PARAM_STREAM: 'stream' }
            } } }
        };
        (service as any).isInitialized = true;
        (service as any).ttsEngine = {
            speak: () => -1 // ERROR – nepodařilo se zařadit
        };
        service.setEnabled(true);

        expect(await service.speak('ahoj')).toBe(false);

        delete (global as any).android;
    });

    it('stop vyřeší čekající čtení jako přerušené', async () => {
        (global as any).android = {
            os: { Bundle: function (this: any) { this.putInt = () => {}; } }, // this: any – jinak TS odvodí typ bez putInt
            media: { AudioManager: { STREAM_MUSIC: 3 } },
            speech: { tts: { TextToSpeech: {
                QUEUE_FLUSH: 0,
                Engine: { KEY_PARAM_STREAM: 'stream' }
            } } }
        };
        (service as any).isInitialized = true;
        (service as any).ttsEngine = {
            speak: () => 0 // zařadí, ale nikdy nedokončí
        };
        service.setEnabled(true);

        const promise = service.speak('dlouhý text');
        service.stop();
        expect(await promise).toBe(false);
        expect((service as any).pendingUtterances.size).toBe(0);

        delete (global as any).android;
    });

    it('getAvailableLanguages vrací výchozí seznam bez Androidu', () => {
        const languages = service.getAvailableLanguages();
        expect(languages).toContain('cs-CZ');
        expect(languages).toContain('en-US');
        expect(languages).toContain('sk-SK');
    });

    it('isLanguageAvailable detekuje podporovaný jazyk', () => {
        expect(service.isLanguageAvailable('cs-CZ')).toBe(true);
        expect(service.isLanguageAvailable('xx-XX')).toBe(false);
    });

    it('dispose nevyhodí chybu bez inicializace', () => {
        expect(() => service.dispose()).not.toThrow();
    });
});
