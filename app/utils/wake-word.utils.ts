/**
 * Utility pro detekci wake word frází v rozpoznaném textu.
 *
 * Normalizuje text i fráze (malá písmena, odstranění diakritiky,
 * normalizace mezer) a porovnává fráze po slovech s tolerancí
 * na 1 chybu rozpoznávání (Levenshteinova vzdálenost) u slov
 * o délce >= 5 znaků. Zachovává i původní porovnání podřetězcem,
 * takže nikdy nezhorší existující chování.
 */
export class WakeWordMatcher {
    /** Normalizuje text: malá písmena, bez diakritiky, bez speciálních znaků, jednolité mezery. */
    public static normalize(text: string): string {
        if (!text) {
            return '';
        }
        return text
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .toLowerCase()
            .replace(/[^a-z0-9\s]/g, ' ')
            .replace(/\s+/g, ' ')
            .trim();
    }

    /** Levenshteinova editační vzdálenost mezi dvěma řetězci. */
    public static levenshtein(a: string, b: string): number {
        if (a === b) {
            return 0;
        }
        if (!a.length) {
            return b.length;
        }
        if (!b.length) {
            return a.length;
        }
        let prev: number[] = [];
        let curr: number[] = [];
        for (let j = 0; j <= b.length; j++) {
            prev[j] = j;
        }
        for (let i = 1; i <= a.length; i++) {
            curr[0] = i;
            for (let j = 1; j <= b.length; j++) {
                const cost = a.charAt(i - 1) === b.charAt(j - 1) ? 0 : 1;
                curr[j] = Math.min(prev[j] + 1, curr[j - 1] + 1, prev[j - 1] + cost);
            }
            const tmp = prev;
            prev = curr;
            curr = tmp;
        }
        return prev[b.length];
    }

    /**
     * Zjistí, zda text obsahuje některou z wake word frází.
     * Porovnává se po normalizaci: buď jako podřetězec (původní
     * chování), nebo po slovech s fuzzy tolerancí (1 chyba u slov
     * o délce >= 5 znaků, u kratších slov jen přesná shoda).
     * @param text Rozpoznaný text (celý i parciální).
     * @param phrases Seznam wake word frází.
     * @param maxDistance Maximální Levenshteinova vzdálenost u fuzzy shody.
     * @returns true, pokud některá fráze odpovídá.
     */
    public static matches(text: string, phrases: string[], maxDistance: number = 1): boolean {
        const normText = WakeWordMatcher.normalize(text);
        if (!normText) {
            return false;
        }
        const tokens = normText.split(' ');
        for (const rawPhrase of phrases ?? []) {
            const phrase = WakeWordMatcher.normalize(rawPhrase);
            if (!phrase) {
                continue;
            }
            // Zpětná kompatibilita: shoda podřetězcem.
            if (normText.includes(phrase)) {
                return true;
            }
            // Fuzzy shoda po slovech (okno o šířce počtu slov fráze).
            const phraseTokens = phrase.split(' ');
            const n = phraseTokens.length;
            for (let i = 0; i + n <= tokens.length; i++) {
                let allOk = true;
                for (let j = 0; j < n; j++) {
                    const pt = phraseTokens[j];
                    const wt = tokens[i + j];
                    if (pt === wt) {
                        continue;
                    }
                    const allowed = pt.length >= 5 ? maxDistance : 0;
                    if (allowed > 0 && Math.abs(pt.length - wt.length) <= allowed
                        && WakeWordMatcher.levenshtein(pt, wt) <= allowed) {
                        continue;
                    }
                    allOk = false;
                    break;
                }
                if (allOk) {
                    return true;
                }
            }
        }
        return false;
    }
}
