import { mockReset } from '../mocks/application-settings.mock';
import { serviceLocator, ServiceTokens } from '../../app/services/service-locator';
import { serviceRegistry } from '../../app/services/service-registry';
import { SettingsService } from '../../app/services/settings.service';
import { TextToSpeechService } from '../../app/services/text-to-speech.service';

describe('ServiceLocator', () => {
    beforeEach(() => {
        mockReset();
        (global as any).android = undefined;
    });

    it('vrací singleton instance (stejná reference při opakovaném get)', () => {
        const a = serviceLocator.get(ServiceTokens.ThemeService);
        const b = serviceLocator.get(ServiceTokens.ThemeService);
        expect(a).toBe(b);
    });

    it('služby s constructor injection dostávají sdílenou SettingsService', () => {
        const shared = serviceLocator.get<SettingsService>(ServiceTokens.SettingsService);
        const tts = serviceLocator.get<TextToSpeechService>(ServiceTokens.TextToSpeechService);
        // Vnitřní sdílená závislost je tatáž instance jako registrovaný singleton
        expect((tts as any).settingsService).toBe(shared);
    });

    it('TextToSpeechService lze konstruovat s injectovanou SettingsService', () => {
        const settings = new SettingsService();
        const tts = new TextToSpeechService({ settingsService: settings });
        expect((tts as any).settingsService).toBe(settings);
    });

    it('IDisposable služby se automaticky registrují pro cleanup (jen jednou)', () => {
        let disposed = false;
        class DisposableTest {
            public dispose() {
                disposed = true;
            }
        }
        serviceLocator.override('test.disposable', () => new DisposableTest());

        const before = serviceRegistry.getCount();
        const a = serviceLocator.get<any>('test.disposable');
        expect(serviceRegistry.getCount()).toBe(before + 1);

        // Opakovaný get neregistruje znovu
        const b = serviceLocator.get<any>('test.disposable');
        expect(b).toBe(a);
        expect(serviceRegistry.getCount()).toBe(before + 1);

        // disposeAll skutečně uvolní registrovanou službu
        serviceRegistry.disposeAll();
        expect(disposed).toBe(true);
    });
});
