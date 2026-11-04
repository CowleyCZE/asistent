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
});
