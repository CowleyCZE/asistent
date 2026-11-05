import { mockReset } from '../mocks/application-settings.mock';
import { SpeechRecognitionService } from '../../app/services/speech-recognition.service';

describe('SpeechRecognitionService', () => {
    let service: SpeechRecognitionService;

    beforeEach(() => {
        mockReset();
        (global as any).android = undefined;
        service = new SpeechRecognitionService();
    });

    it('vytvoří službu bez Androidu bez chyby', () => {
        expect(service).toBeDefined();
    });

    it('startWakeWordDetection a startListening nepropadnou bez Androidu', () => {
        expect(() => service.startWakeWordDetection()).not.toThrow();
        expect(() => service.startListening()).not.toThrow();
    });

    it('dispose zastaví a zničí recognizer', () => {
        const recognizer = { stopListening: jest.fn(), destroy: jest.fn() };
        (service as any).speechRecognizer = recognizer;
        (service as any).isListening = true;
        service.dispose();
        expect(recognizer.stopListening).toHaveBeenCalled();
        expect(recognizer.destroy).toHaveBeenCalled();
    });

    it('setContinuousListening přepne kontinuální režim', () => {
        expect(service.isContinuousListeningEnabled()).toBe(false);
        service.setContinuousListening(true);
        expect(service.isContinuousListeningEnabled()).toBe(true);
        service.setContinuousListening(false);
        expect(service.isContinuousListeningEnabled()).toBe(false);
    });

    it('getRecognitionLanguage vrací výchozí cs-CZ', () => {
        expect(service.getRecognitionLanguage()).toBe('cs-CZ');
    });

    it('setRecognitionLanguage uloží podporovaný jazyk', () => {
        service.setRecognitionLanguage('en-US');
        expect(service.getRecognitionLanguage()).toBe('en-US');
    });

    it('notifikace speechResult dorazí k odběrateli', () => {
        const handler = jest.fn();
        service.on('speechResult', handler);
        (service as any).notify({ eventName: 'speechResult', text: 'ahoj' });
        expect(handler).toHaveBeenCalledWith(
            expect.objectContaining({ eventName: 'speechResult', text: 'ahoj' })
        );
    });

    describe('wake word chybová smyčka (P1)', () => {
        it('fatální chyba (permissions/busy/client) zastaví detekci a nahlásí speechError', () => {
            const handler = jest.fn();
            service.on('speechError', handler);
            (service as any).continuousListening = true;
            (service as any).isListening = true;

            // ERROR_INSUFFICIENT_PERMISSIONS = 9 (fatální)
            (service as any).handleWakeWordError(9);

            expect((service as any).continuousListening).toBe(false);
            expect(handler).toHaveBeenCalledWith(
                expect.objectContaining({ eventName: 'speechError', error: 9 })
            );
        });

        it('překročení limitu chyb v řadě zastaví detekci (backoff nesmí být nekonečný)', () => {
            jest.useFakeTimers();
            const handler = jest.fn();
            service.on('speechError', handler);
            (service as any).continuousListening = true;
            (service as any).isListening = true;

            // ERROR_NO_MATCH = 7 (benigní) × 6 → nad limit 5
            for (let i = 0; i < 6; i++) {
                (service as any).handleWakeWordError(7);
            }

            expect((service as any).continuousListening).toBe(false);
            expect(handler).toHaveBeenCalled();
            jest.useRealTimers();
        });

        it('restart po benigní chybě používá exponenciální backoff', () => {
            jest.useFakeTimers();
            (service as any).continuousListening = true;
            (service as any).isListening = true;

            (service as any).handleWakeWordError(7); // 1. chyba → 1000 ms
            expect((service as any).retryTimer).toBeDefined();
            jest.advanceTimersByTime(1000);

            // Timer vypršel, ale bez recognizeru se restart neprovede – smyčka nebeží dál
            expect((service as any).retryTimer).toBeUndefined();

            (service as any).handleWakeWordError(7); // 2. chyba → 2000 ms
            jest.advanceTimersByTime(1000);
            expect((service as any).retryTimer).toBeDefined(); // ještě čeká
            jest.useRealTimers();
        });

        it('stopListening zruší naplánovaný restart poslechu', () => {
            jest.useFakeTimers();
            const recognizer = { stopListening: jest.fn(), destroy: jest.fn() };
            (service as any).speechRecognizer = recognizer;
            (service as any).continuousListening = true;
            (service as any).isListening = true;

            (service as any).handleWakeWordError(7);
            expect((service as any).retryTimer).toBeDefined();

            service.stopListening();
            expect((service as any).retryTimer).toBeUndefined();
            jest.useRealTimers();
        });
    });
});
