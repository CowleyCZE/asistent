import { IntentRecognitionService } from '../../app/services/intent-recognition.service';

/**
 * Testy IntentRecognitionService (P4: intent recognition).
 * Rule-based rozpoznávání – čas/datum přes realné hodnoty Date.
 */
describe('IntentRecognitionService', () => {
    let service: IntentRecognitionService;

    beforeEach(() => {
        service = new IntentRecognitionService();
    });

    it('rozpozná otázku na čas a vrátí odpověď s aktuálním časem', () => {
        const result = service.recognize('Kolik je hodin?');
        expect(result).not.toBeNull();
        expect(result?.intent).toBe('time');
        expect(result?.confidence).toBe(1);
        expect(result?.response).toMatch(/Je \d{1,2} hodin a \d{1,2} minut/);
    });

    it('rozpozná otázku na datum', () => {
        const now = new Date();
        const result = service.recognize('Jaké je dnes datum?');
        expect(result?.intent).toBe('date');
        expect(result?.response).toBe(`Dnes je ${now.getDate()}. ${now.getMonth() + 1}. ${now.getFullYear()}.`);
    });

    it('rozpozná pozdrav bez ohledu na velikost písmen', () => {
        const result = service.recognize('AHOJ');
        expect(result?.intent).toBe('greeting');
        expect(result?.response).toBe('Ahoj! Jak ti můžu pomoci?');
    });

    it('rozpozná poděkování', () => {
        const result = service.recognize('Mockrát děkuji');
        expect(result?.intent).toBe('thanks');
    });

    it('rozpozná žádost o vtip a žert o počasí', () => {
        expect(service.recognize('Řekni mi vtip')?.intent).toBe('joke');
        expect(service.recognize('Jaké je počasí v Praze?')?.intent).toBe('weather');
    });

    it('rozpozná žádost o pomoc', () => {
        const result = service.recognize('Co umíš?');
        expect(result?.intent).toBe('help');
        expect(result?.response).toContain('IFTTT');
    });

    it('vrátí null pro úplně neznámý příkaz', () => {
        const result = service.recognize('zaprogramuj mi kolenu nadrcenou okurku');
        expect(result).toBeNull();
    });

    it('vrátí null pro prázdný nebo neplatný vstup', () => {
        expect(service.recognize('')).toBeNull();
        expect(service.recognize(undefined as unknown as string)).toBeNull();
    });

    it('getSupportedIntents vrací všechny podporované záměry', () => {
        const intents = service.getSupportedIntents();
        expect(intents).toEqual(expect.arrayContaining(['time', 'date', 'greeting', 'thanks', 'joke', 'weather', 'help']));
        expect(intents.length).toBe(7);
    });
});
