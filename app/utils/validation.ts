/**
 * Validators - validace a sanitizace vstupů.
 * Používá se ve SettingsService, AssistantService a CommandProcessoru.
 */

/** Výsledek validace */
export interface ValidationResult {
    valid: boolean;
    errors: string[];
}

/** Strukturální typ akce (bez závislosti na settings.service - žádný cyklický import) */
export interface ActionLike {
    name?: string;
    phrase?: string;
    type?: string;
    url?: string;
    taskName?: string;
}

/** Limity textových polí */
export const Limits = {
    ACTION_NAME_MAX: 50,
    ACTION_NAME_MIN: 1,
    PHRASE_MAX: 100,
    PHRASE_MIN: 3,
    URL_MAX: 2048,
    TASK_NAME_MAX: 64,
    COMMAND_MAX: 500
} as const;

export class Validators {
    /**
     * Regex pro webhook URL - povolen pouze HTTPS s platnou doménou,
     * bez mezer a nebezpečných znaků.
     */
    public static readonly WEBHOOK_URL_PATTERN =
        /^https:\/\/[a-zA-Z0-9]([a-zA-Z0-9-]*[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9-]*[a-zA-Z0-9])?)*\.[a-zA-Z]{2,}(:\d{1,5})?(\/[^\s"'<>\\]*)?$/;

    /** Validuje webhook URL (HTTPS, formát, délka). */
    public static isValidWebhookUrl(url: string | undefined | null): boolean {
        if (!url || typeof url !== 'string') {
            return false;
        }
        const trimmed = url.trim();
        if (trimmed.length === 0 || trimmed.length > Limits.URL_MAX) {
            return false;
        }
        return Validators.WEBHOOK_URL_PATTERN.test(trimmed);
    }

    /**
     * Sanitizuje textový vstup: trim, odstranění řídicích znaků,
     * omezení délky. Vždy vrací bezpečný string (nikdy null/undefined).
     */
    public static sanitizeText(input: string | undefined | null, maxLength: number): string {
        if (typeof input !== 'string') {
            return '';
        }
        return input
            .replace(/[\u0000-\u001F\u007F]/g, '') // řídicí znaky
            .trim()
            .slice(0, maxLength);
    }

    /** Zvaliduje a sanitisuje akci (název, fráze, URL/taskName podle typu). */
    public static validateAction(action: ActionLike): { action: ActionLike; result: ValidationResult } {
        const errors: string[] = [];

        const name = Validators.sanitizeText(action?.name, Limits.ACTION_NAME_MAX);
        if (name.length < Limits.ACTION_NAME_MIN) {
            errors.push('Název akce je povinný (1-50 znaků).');
        }

        const phrase = Validators.sanitizeText(action?.phrase, Limits.PHRASE_MAX);
        if (phrase.length < Limits.PHRASE_MIN) {
            errors.push(`Aktivační fráze musí mít alespoň ${Limits.PHRASE_MIN} znaky.`);
        }

        const type = action?.type;
        let url: string | undefined;
        let taskName: string | undefined;

        if (type === 'webhook') {
            url = Validators.sanitizeText(action?.url, Limits.URL_MAX);
            if (!Validators.isValidWebhookUrl(url)) {
                errors.push('URL webhooku musí být platná HTTPS adresa.');
            }
        } else if (type === 'tasker') {
            taskName = Validators.sanitizeText(action?.taskName, Limits.TASK_NAME_MAX);
            if (taskName.length === 0) {
                errors.push('Název Tasker úlohy je povinný.');
            }
        } else {
            errors.push('Typ akce musí být "webhook" nebo "tasker".');
        }

        return {
            action: { name, phrase, type, url, taskName },
            result: { valid: errors.length === 0, errors }
        };
    }
}
