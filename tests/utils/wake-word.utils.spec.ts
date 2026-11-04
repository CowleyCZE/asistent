import { WakeWordMatcher } from '../../app/utils/wake-word.utils';

describe('WakeWordMatcher (P3 wake word detection)', () => {
    it('normalize odstraní diakritiku a normalizuje mezery', () => {
        expect(WakeWordMatcher.normalize('  Asistence, Řeči! ')).toBe('asistence reci');
    });

    it('matches najde frázi jako podřetězec (zpětná kompatibilita)', () => {
        expect(WakeWordMatcher.matches('prosím asistente zapni světlo', ['asistent'])).toBe(true);
    });

    it('matches odpustí 1 chybu rozpoznávání u delších slov', () => {
        expect(WakeWordMatcher.matches('ahoj asistente jak se mas', ['asistent'])).toBe(true);
        expect(WakeWordMatcher.matches('hej asistenti co děláš', ['asistent'])).toBe(true);
    });

    it('matches nereaguje na úplně jiná slova', () => {
        expect(WakeWordMatcher.matches('zapni světlo v obýváku', ['asistent'])).toBe(false);
    });

    it('matches funguje s víceslovnými frázemi', () => {
        expect(WakeWordMatcher.matches('hej asistent zapni světlo', ['hej asistent'])).toBe(true);
        // tolerance 1 chyby funguje i u víceslovné fráze
        expect(WakeWordMatcher.matches('hej asistenti zapni světlo', ['hej asistent'])).toBe(true);
    });

    it('matches ignoruje diakritiku na obou stranách', () => {
        expect(WakeWordMatcher.matches('řekni ahoj asistente', ['asistent'])).toBe(true);
    });

    it('matches vrací false pro prázdný text i fráze', () => {
        expect(WakeWordMatcher.matches('', ['asistent'])).toBe(false);
        expect(WakeWordMatcher.matches('asistent', [''])).toBe(false);
        expect(WakeWordMatcher.matches('asistent', [])).toBe(false);
    });

    it('levenshtein počítá editační vzdálenost', () => {
        expect(WakeWordMatcher.levenshtein('asistent', 'asistent')).toBe(0);
        expect(WakeWordMatcher.levenshtein('asistent', 'asistente')).toBe(1);
        expect(WakeWordMatcher.levenshtein('kot', 'pes')).toBe(3);
    });
});
