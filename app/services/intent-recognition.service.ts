/**
 * IntentRecognitionService - jednoduché rozpoznávání intention (záměru)
 * hlasového příkazu pomocí pravidel/regexů pro český jazyk.
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
}

/** Pravidlo rozpoznávání: regex + generátor odpovědi. */
interface IntentRule {
    intent: string;
    pattern: RegExp;
    response: () => string;
}

/**
 * Rozpoznávání záměrů hlasových příkazů (rule-based NLP).
 */
export class IntentRecognitionService {
    /** Seznam pravidel v pořadí priority (první shoda vyhrává). */
    private readonly rules: IntentRule[] = [
        {
            intent: 'time',
            pattern: /(kolik\s+je\s+hodin|aktu[áa]ln[íi]\s+[čc]as|kolik\s+je\s+[čc]as)/i,
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
            response: () => {
                const now = new Date();
                return `Dnes je ${now.getDate()}. ${now.getMonth() + 1}. ${now.getFullYear()}.`;
            }
        },
        {
            intent: 'greeting',
            pattern: /(ahoj|dobr[ýy]\s+(den|ve[čc]er|ráno)|[čc]au|zdrav[íi]m)/i,
            response: () => 'Ahoj! Jak ti můžu pomoci?'
        },
        {
            intent: 'thanks',
            pattern: /(d[ěe]kuji|d[íi]ky|d[ěe]kuju)/i,
            response: () => 'Není zač, rád jsem pomohl.'
        },
        {
            intent: 'joke',
            pattern: /(vtip|rozesm[íi]j|zab[áa]v)/i,
            response: () => 'Proč si programátor během Vánoc mění světlo sám? Protože má switch-case.'
        },
        {
            intent: 'weather',
            pattern: /(po[čc]as[íi]|pr[šs][íi]|mrzne|sn[íi][žz][íi])/i,
            response: () => 'Počasí zatím neumím zjistit. Přidej si akci s webhookem na meteorologickou službu.'
        },
        {
            intent: 'help',
            pattern: /(co\s+um[íi][šs]|n[áa]pov[ěe]da|pomoc|co\s+dok[áa][žz]e[šs])/i,
            response: () => 'Umím spouštět akce podle frází: webhooks, Tasker, IFTTT a Home Assistant. Zeptej se mě také na čas nebo datum.'
        }
    ];

    /**
     * Rozpozná záměr příkazu podle pravidel.
     * @returns Rozpoznaný záměr s odpovědí, nebo null pro neznámý příkaz.
     */
    public recognize(command: string): RecognizedIntent | null {
        if (typeof command !== 'string' || command.trim().length === 0) {
            return null;
        }
        for (const rule of this.rules) {
            if (rule.pattern.test(command)) {
                try {
                    return {
                        intent: rule.intent,
                        confidence: 1,
                        response: rule.response()
                    };
                } catch (error) {
                    console.error(`Chyba při generování odpovědi pro záměr ${rule.intent}:`, error);
                    return null;
                }
            }
        }
        return null;
    }

    /** Vrací seznam podporovaných záměrů (pro dokumentaci/testy). */
    public getSupportedIntents(): string[] {
        return this.rules.map(r => r.intent);
    }
}
