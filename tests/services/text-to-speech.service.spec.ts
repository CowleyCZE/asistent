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
