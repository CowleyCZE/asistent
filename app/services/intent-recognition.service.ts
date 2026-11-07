/**
 * IntentRecognitionService - rozpoznávání intention (záměru)
 * hlasového příkazu pro český jazyk.
 *
 * NLP vrstva (P4 "Implementovat NLP"):
 * - normalizace textu (malá písmena, odstranění diakritiky),
 * - pravidlové rozpoznávání (regex) s plnou jistotou,
 * - fuzzy matching (Levenshteinova vzdálenost) pro chybně
 *   rozpoznanou řeč (SpeechRecognizer často vrátí "cas" místo "čas").
 *
 * Context understanding (P4 "Přidat context understanding"):
 * - služba si pamatuje poslední záměr, odpověď a čas (TTL 5 minut),
 * - follow-up příkazy ("znovu", "zopakuj to", "ještě jednou", "repeat")
 *   vrátí poslední odpověď.
 *
 * Používá se jako fallback, když žádná akce (webhook/tasker/ifttt/...)
 * neodpovídá příkazu – asistent pak umí odpovědět alespoň
 * na základní otázky (čas, datum, pozdrav, ...).
 */

/** Rozpoznaný záměr příkazu. */
export interface RecognizedIntent {
    /** Identifikátor záměru (např. 'time', 'greeting'). */
    intent: string;
    /** Jistota rozpoznání 0–1 (pravidlové rozpoznávání: 1.0 = plná shoda). */
    confidence: number;
    /** Textová odpověď, kterou lze přečíst přes TTS. */
    response: string;
    /** True, pokud jde o navazující odpověď z konverzačního kontextu. */
    isFollowUp?: boolean;
}

/** Pravidlo rozpoznávání: regex + klíčová slova pro fuzzy match + generátor odpovědi. */
interface IntentRule {
    intent: string;
    pattern: RegExp;
    /** Klíčová slova (bez diakritiky, malá písmena) pro fuzzy matching. */
    keywords: string[];
    response: () => string;
}

/** Kontext poslední konverzace (pro follow-up příkazy). */
interface ConversationContext {
    lastIntent: string | null;
    lastResponse: string | null;
    lastCommand: string | null;
    timestamp: number;
}

/** Jak dlouho (ms) zůstává kontext platný pro follow-up příkazy. */
const CONTEXT_TTL_MS = 5 * 60 * 1000;

/** Minimální podobnost (0–1) pro fuzzy rozpoznání záměru. */
const FUZZY_THRESHOLD = 0.72;

/**
 * Rozpoznávání záměrů hlasových příkazů (rule-based NLP
 * s fuzzy matchingem a konverzačním kontextem).
 */
export class IntentRecognitionService {
    /** Konverzační kontext pro follow-up příkazy. */
    private context: ConversationContext = {
        lastIntent: null,
        lastResponse: null,
        lastCommand: null,
        timestamp: 0
    };
    /** Seznam pravidel v pořadí priority (první shoda vyhrává). */
    private readonly rules: IntentRule[] = [
        {
            intent: 'time',
            pattern: /(kolik\s+je\s+hodin|aktu[áa]ln[íi]\s+[čc]as|kolik\s+je\s+[čc]as)/i,
            keywords: ['kolik je hodin', 'aktualni cas', 'kolik je cas'],
            response: () => {
                const now = new Date();
                const hours = now.getHours();
                const minutes = now.getMinutes();
                const minutesText = minutes === 1 ? 'minuta' : (minutes >= 2 && minutes <= 4 ? 'minuty' : 'minut');
                return `Je ${hours} hodin a ${minutes} ${minutesText}.`;
            }
        },
        {
            intent: 'date',
            pattern: /(jak[ée]\s+je\s+(dnes\s+)?(datum|[čc]l[íi]nek)|kolik[áa]t[ée]ho\s+je)/i,
            keywords: ['jake je dnes datum', 'jake je datum', 'kolikateho je', 'jaky je den'],
            response: () => {
                const now = new Date();
                return `Dnes je ${now.getDate()}. ${now.getMonth() + 1}. ${now.getFullYear()}.`;
            }
        },
        {
            intent: 'greeting',
            pattern: /(ahoj|dobr[ýy]\s+(den|ve[čc]er|ráno)|[čc]au|zdrav[íi]m)/i,
            keywords: ['ahoj', 'dobry den', 'dobry vecer', 'dobre rano', 'cau', 'zdravim'],
            response: () => 'Ahoj! Jak ti můžu pomoci?'
        },
        {
            intent: 'thanks',
            pattern: /(d[ěe]kuji|d[íi]ky|d[ěe]kuju)/i,
            keywords: ['dekuji', 'diky', 'dekuju'],
            response: () => 'Není zač, rád jsem pomohl.'
        },
        {
            intent: 'joke',
            pattern: /(vtip|rozesm[íi]j|zab[áa]v)/i,
            keywords: ['vtip', 'rozesmej me', 'zabav me'],
            response: () => 'Proč si programátor během Vánoc mění světlo sám? Protože má switch-case.'
        },
        {
            intent: 'weather',
            pattern: /(po[čc]as[íi]|pr[šs][íi]|mrzne|sn[íi][žz][íi])/i,
            keywords: ['pocasi', 'prsi', 'mrzne', 'snizi'],
            response: () => 'Počasí zatím neumím zjistit. Přidej si akci s webhookem na meteorologickou službu.'
        },
        {
            intent: 'help',
            pattern: /(co\s+um[íi][šs]|n[áa]pov[ěe]da|pomoc|co\s+dok[áa][žz]e[šs])/i,
            keywords: ['co umis', 'napoveda', 'pomoc', 'co dokazes'],
            response: () => 'Umím spouštět akce podle frází: webhooks, Tasker, IFTTT a Home Assistant. Zeptej se mě také na čas nebo datum.'
        }
    ];

    /**
     * Rozpozná záměr příkazu podle pravidel (regex) a případně
     * fuzzy matchingem; udržuje konverzační kontext.
     * @returns Rozpoznaný záměr s odpovědí, nebo null pro neznámý příkaz.
     */
    public recognize(command: string): RecognizedIntent | null {
        if (typeof command !== 'string' || command.trim().length === 0) {
            return null;
        }

        // 1) Follow-up příkazy ("znovu", "zopakuj to", ...) z kontextu
        const followUp = this.matchFollowUp(command);
        if (followUp) {
            return followUp;
        }

        // 2) Přesná (regex) shoda – plná jistota
        for (const rule of this.rules) {
            if (rule.pattern.test(command)) {
                return this.finalize(rule.intent, 1, rule);
            }
        }

        // 3) Fuzzy shoda (normalizace + Levenshtein) pro chybně
        //    rozpoznanou řeč od SpeechRecognizeru
        const fuzzy = this.matchFuzzy(command);
        if (fuzzy) {
            return this.finalize(fuzzy.rule.intent, fuzzy.confidence, fuzzy.rule);
        }

        return null;
    }

    /** Vrací seznam podporovaných záměrů (pro dokumentaci/testy). */
    public getSupportedIntents(): string[] {
        return this.rules.map(r => r.intent);
    }

    /** Vrací aktuální konverzační kontext (pro testy/diagnostiku). */
    public getContext(): Readonly<ConversationContext> {
        return this.context;
    }

    /** Resetuje konverzační kontext (nová konverzace). */
    public resetContext(): void {
        this.context = {
            lastIntent: null,
            lastResponse: null,
            lastCommand: null,
            timestamp: 0
        };
    }

    /**
     * Detekuje follow-up příkaz ("znovu", "zopakuj to", "ještě jednou",
     * "repeat") a vrátí poslední odpověď z kontextu, pokud je stále platný.
     */
    private matchFollowUp(command: string): RecognizedIntent | null {
        const normalized = this.normalize(command);
        const isRepeatRequest = /^(znovu|zopakuj(\s+(to|to prosim))?|jesce jednou|opakuj(\s+to)?|repeat)\b/.test(normalized)
            || normalized === 'znovu'
            || normalized === 'jesce jednou';

        if (!isRepeatRequest) {
            return null;
        }

        const contextAge = Date.now() - this.context.timestamp;
        if (!this.context.lastResponse || contextAge > CONTEXT_TTL_MS || contextAge < 0) {
            // Kontext vypršel – follow-up neumíme vyřešit
            return null;
        }

        return {
            intent: this.context.lastIntent ?? 'unknown',
            confidence: 0.9,
            response: this.context.lastResponse,
            isFollowUp: true
        };
    }

    /**
     * Fuzzy rozpoznání: normalizuje příkaz a klíčová slova pravidel
     * a hledá nejlepší podobnost (Levenshtein). Vrací pravidlo
     * s jistotou nad prahem FUZZY_THRESHOLD, nebo null.
     */
    private matchFuzzy(command: string): { rule: IntentRule; confidence: number } | null {
        const normalized = this.normalize(command);
        if (normalized.length === 0) {
            return null;
        }

        let best: { rule: IntentRule; confidence: number } | null = null;

        for (const rule of this.rules) {
            for (const keyword of rule.keywords) {
                const similarity = this.bestWindowSimilarity(normalized, keyword);
                if (similarity >= FUZZY_THRESHOLD && (!best || similarity > best.confidence)) {
                    best = { rule, confidence: Math.round(similarity * 100) / 100 };
                }
            }
        }

        return best;
    }

    /**
     * Nejlepší podobnost klíčového slova proti libovolnému oknu slov
     * normalizovaného příkazu (klíčové slovo se může objevit uprostřed
     * delšího promlouvání).
     */
    private bestWindowSimilarity(normalizedCommand: string, keyword: string): number {
        const commandWords = normalizedCommand.split(/\s+/).filter(w => w.length > 0);
        const keywordWords = keyword.split(/\s+/).filter(w => w.length > 0);
        const windowSize = keywordWords.length;
        let best = 0;

        if (commandWords.length < windowSize) {
            // Příkaz je kratší než klíčové slovo – porovnáme celé najednou
            return this.similarity(normalizedCommand, keyword);
        }

        for (let i = 0; i + windowSize <= commandWords.length; i++) {
            const window = commandWords.slice(i, i + windowSize).join(' ');
            const score = this.similarity(window, keyword);
            if (score > best) {
                best = score;
            }
        }
        return best;
    }

    /** Normalizuje text: malá písmena, bez diakritiky, bez mezer navíc. */
    private normalize(text: string): string {
        return text
            .toLowerCase()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '') // combining diacritics
            .replace(/\s+/g, ' ')
            .trim();
    }

    /**
     * Podobnost dvou řetězců 0–1 na základě Levenshteinovy vzdálenosti
     * (1 = identické). Jednoduchá DP implementace bez externích závislostí.
     */
    private similarity(a: string, b: string): number {
        if (a === b) {
            return 1;
        }
        const maxLen = Math.max(a.length, b.length);
        if (maxLen === 0) {
            return 1;
        }
        const distance = this.levenshtein(a, b);
        return 1 - distance / maxLen;
    }

    /** Levenshteinova editační vzdálenost (klasické DP). */
    private levenshtein(a: string, b: string): number {
        const m = a.length;
        const n = b.length;
        if (m === 0) {
            return n;
        }
        if (n === 0) {
            return m;
        }

        let prev = new Array<number>(n + 1);
        let curr = new Array<number>(n + 1);
        for (let j = 0; j <= n; j++) {
            prev[j] = j;
        }

        for (let i = 1; i <= m; i++) {
            curr[0] = i;
            for (let j = 1; j <= n; j++) {
                const cost = a.charCodeAt(i - 1) === b.charCodeAt(j - 1) ? 0 : 1;
                curr[j] = Math.min(
                    prev[j] + 1,        // deletion
                    curr[j - 1] + 1,    // insertion
                    prev[j - 1] + cost  // substitution
                );
            }
            const tmp = prev;
            prev = curr;
            curr = tmp;
        }
        return prev[n];
    }

    /** Zapíše výsledek do kontextu a vrátí RecognizedIntent (null při chybě generování odpovědi). */
    private finalize(intent: string, confidence: number, rule: IntentRule): RecognizedIntent | null {
        try {
            const response = rule.response();
            this.context = {
                lastIntent: intent,
                lastResponse: response,
                lastCommand: intent,
                timestamp: Date.now()
            };
            return { intent, confidence, response };
        } catch (error) {
            console.error(`Chyba při generování odpovědi pro záměr ${rule.intent}:`, error);
            return null;
        }
    }

}
