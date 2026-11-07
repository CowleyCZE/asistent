import { ApplicationSettings } from '@nativescript/core';
import { StorageKeys } from '../utils/constants';
import { Validators, ValidationResult } from '../utils/validation';

export type ActionType = 'webhook' | 'tasker' | 'ifttt' | 'homeassistant' | 'custom';

export interface Action {
    name: string;
    phrase: string;
    type: ActionType;
    url?: string; // Pro webhooky; pro Home Assistant základní URL instance
    taskName?: string; // Pro Tasker
    iftttEvent?: string; // Název události pro IFTTT Maker Webhooks
    iftttKey?: string; // Klíč IFTTT Maker Webhooks
    haToken?: string; // Long-lived access token Home Assistant
    haService?: string; // Služba Home Assistant (např. light.turn_on)
    haEntity?: string; // Entity ID Home Assistant (např. light.obyvak), volitelné
    customResponse?: string; // Vlastní TTS odpověď pro typ 'custom'
}

export interface WebhookAuth {
    apiKey?: string;
    hmacSecret?: string;
    useHmac?: boolean;
}

export interface AppSettings {
    wakePhrases: string[];
    feedbackEnabled: boolean;
    sensitivity: number;
    actions: Action[]; // Přejmenováno z webhooks
    ttsEnabled: boolean;
    ttsLanguage: string;
    ttsPitch: number;
    ttsRate: number;
    speechLanguage: string; // Jazyk rozpoznávání řeči (cs-CZ, en-US, de-DE, sk-SK)
    webhookAuth?: WebhookAuth;
}

/** Správa nastavení aplikace, akcí a webhook autentizace (perzistence v ApplicationSettings). */
export class SettingsService {
    private readonly SETTINGS_KEY = StorageKeys.Settings; // Změna klíče pro migraci
    private readonly DEFAULT_SETTINGS: AppSettings = {
        wakePhrases: ['Hey asistente', 'Pomoc'],
        feedbackEnabled: true,
        sensitivity: 0.5,
        actions: [
            { name: "Světlo v obýváku", phrase: "rozsviť světlo v obýváku", type: 'webhook', url: "https://example.com/webhook/living-room-light-on" },
            { name: "Televize", phrase: "zapni televizi", type: 'webhook', url: "https://example.com/webhook/tv-on" },
            { name: "Spusť hudbu", phrase: "pusť hudbu", type: 'tasker', taskName: "PlayMusic" }
        ],
        ttsEnabled: true,
        ttsLanguage: 'cs-CZ',
        ttsPitch: 1.0,
        ttsRate: 1.0,
        speechLanguage: 'cs-CZ',
        webhookAuth: {
            apiKey: '',
            hmacSecret: '',
            useHmac: false
        }
    };

    constructor() {
        this.migrateOldSettings();
    }

    private migrateOldSettings() {
        const oldSettingsKey = StorageKeys.LegacySettings;
        const oldSettings = ApplicationSettings.getString(oldSettingsKey);
        if (oldSettings) {
            let parsedOld: any;
            try {
                parsedOld = JSON.parse(oldSettings);
            } catch (e) {
                console.error('Chyba při migraci starých nastavení:', e);
                ApplicationSettings.remove(oldSettingsKey);
                return;
            }
            if (parsedOld.webhooks) {
                const newActions: Action[] = parsedOld.webhooks.map((wh: any) => ({
                    ...wh,
                    type: 'webhook'
                }));
                const newSettings: AppSettings = {
                    ...parsedOld,
                    actions: newActions,
                    webhooks: undefined // odstraníme staré pole
                };
                this.saveSettings(newSettings);
                ApplicationSettings.remove(oldSettingsKey); // Smažeme stará nastavení
            }
        }
    }

    /** Vrací nastavení aplikace (s doplněním chybějících výchozích hodnot). */
    public getSettings(): AppSettings {
        const settings = ApplicationSettings.getString(this.SETTINGS_KEY);
        if (settings) {
            try {
                const parsed = JSON.parse(settings);
                // Null-safety: doplnění chybějících polí výchozími hodnotami
                parsed.actions = Array.isArray(parsed.actions)
                    ? parsed.actions
                    : this.DEFAULT_SETTINGS.actions;
                parsed.wakePhrases = parsed.wakePhrases ?? this.DEFAULT_SETTINGS.wakePhrases;
                parsed.ttsEnabled = parsed.ttsEnabled ?? this.DEFAULT_SETTINGS.ttsEnabled;
                parsed.ttsLanguage = parsed.ttsLanguage ?? this.DEFAULT_SETTINGS.ttsLanguage;
                parsed.ttsPitch = parsed.ttsPitch ?? this.DEFAULT_SETTINGS.ttsPitch;
                parsed.ttsRate = parsed.ttsRate ?? this.DEFAULT_SETTINGS.ttsRate;
                parsed.speechLanguage = parsed.speechLanguage ?? this.DEFAULT_SETTINGS.speechLanguage;
                parsed.feedbackEnabled = parsed.feedbackEnabled ?? this.DEFAULT_SETTINGS.feedbackEnabled;
                parsed.sensitivity = typeof parsed.sensitivity === 'number' ? parsed.sensitivity : this.DEFAULT_SETTINGS.sensitivity;
                return parsed;
            } catch (e) {
                console.error('Chyba při parsování nastavení, vracím výchozí:', e);
                return this.DEFAULT_SETTINGS;
            }
        }
        return this.DEFAULT_SETTINGS;
    }

    private saveSettings(settings: AppSettings) {
        ApplicationSettings.setString(this.SETTINGS_KEY, JSON.stringify(settings));
    }

    /** Aktualizuje wake word fráze (s validací a sanitizací). */
    public updateWakePhrases(phrases: string[]) {
        const settings = this.getSettings();
        settings.wakePhrases = (phrases ?? [])
            .map(p => Validators.sanitizeText(p, 100))
            .filter(p => p.length > 0);
        this.saveSettings(settings);
    }

    /** Zapne nebo vypne hlasovou zpětnou vazbu. */
    public updateFeedback(enabled: boolean) {
        const settings = this.getSettings();
        settings.feedbackEnabled = enabled;
        this.saveSettings(settings);
    }

    /** Aktualizuje citlivost rozpoznávání. */
    public updateSensitivity(value: number) {
        const settings = this.getSettings();
        settings.sensitivity = value;
        this.saveSettings(settings);
    }

    /** Vrací seznam všech akcí. */
    public getActions(): Action[] {
        return this.getSettings()?.actions ?? [];
    }

    /**
     * Přidá akci po validaci a sanitizaci vstupů.
     * @returns Výsledek validace (valid=false = akce nebyla uložena).
     */
    public addAction(action: Action): ValidationResult {
        const { action: sanitized, result } = Validators.validateAction(action);
        if (!result.valid) {
            result.errors.forEach(e => console.error('Validace akce:', e));
            return result;
        }
        const settings = this.getSettings();
        settings.actions.push(sanitized as Action);
        this.saveSettings(settings);
        return result;
    }

    /**
     * Aktualizuje akci po validaci a sanitizaci vstupů.
     * @returns Výsledek validace (valid=false = akce nebyla uložena).
     */
    public updateAction(index: number, action: Action): ValidationResult {
        const { action: sanitized, result } = Validators.validateAction(action);
        if (!result.valid) {
            result.errors.forEach(e => console.error('Validace akce:', e));
            return result;
        }
        const settings = this.getSettings();
        if (index >= 0 && index < settings.actions.length) {
            settings.actions[index] = sanitized as Action;
            this.saveSettings(settings);
        }
        return result;
    }

    /** Smaže akci podle indexu. */
    public deleteAction(index: number) {
        const settings = this.getSettings();
        if (index >= 0 && index < settings.actions.length) {
            settings.actions.splice(index, 1);
            this.saveSettings(settings);
        }
    }

    // TTS Settings
    /** Zapne nebo vypne TTS. */
    public updateTTSEnabled(enabled: boolean) {
        const settings = this.getSettings();
        settings.ttsEnabled = enabled;
        this.saveSettings(settings);
    }

    /** Nastaví jazyk TTS. */
    public updateTTSLanguage(language: string) {
        const settings = this.getSettings();
        settings.ttsLanguage = language;
        this.saveSettings(settings);
    }

    /** Nastaví výšku hlasu TTS (0.5–2.0). */
    public updateTTSPitch(pitch: number) {
        const settings = this.getSettings();
        settings.ttsPitch = Math.max(0.5, Math.min(2.0, pitch));
        this.saveSettings(settings);
    }

    /** Nastaví rychlost řeči TTS (0.5–2.0). */
    public updateTTSRate(rate: number) {
        const settings = this.getSettings();
        settings.ttsRate = Math.max(0.5, Math.min(2.0, rate));
        this.saveSettings(settings);
    }

    /** Vrací konfiguraci TTS (enabled, language, pitch, rate). */
    public getTTSConfig() {
        const settings = this.getSettings();
        return {
            enabled: settings.ttsEnabled,
            language: settings.ttsLanguage,
            pitch: settings.ttsPitch,
            rate: settings.ttsRate
        };
    }

    // Speech Recognition Settings
    /** Podporované jazyky rozpoznávání řeči. */
    public static readonly SUPPORTED_RECOGNITION_LANGUAGES: string[] = ['cs-CZ', 'en-US', 'de-DE', 'sk-SK'];

    /** Vrací jazyk rozpoznávání řeči (výchozí cs-CZ). */
    public getSpeechLanguage(): string {
        const settings = this.getSettings();
        return settings.speechLanguage ?? this.DEFAULT_SETTINGS.speechLanguage;
    }

    /** Nastaví jazyk rozpoznávání řeči (pouze podporované jazyky, jinak beze změny). */
    public updateSpeechLanguage(language: string) {
        if (!SettingsService.SUPPORTED_RECOGNITION_LANGUAGES.includes(language)) {
            console.error('Nepodporovaný jazyk rozpoznávání řeči:', language);
            return;
        }
        const settings = this.getSettings();
        settings.speechLanguage = language;
        this.saveSettings(settings);
    }

    // Webhook Auth Settings
    /** Vrací autentizaci webhooků (API klíč, HMAC secret). */
    public getWebhookAuth(): WebhookAuth {
        const settings = this.getSettings();
        return settings?.webhookAuth ?? { apiKey: '', hmacSecret: '', useHmac: false };
    }

    /** Aktualizuje celou autentizaci webhooků. */
    public updateWebhookAuth(auth: WebhookAuth) {
        const settings = this.getSettings();
        settings.webhookAuth = auth;
        this.saveSettings(settings);
    }

    /** Aktualizuje API klíč webhooků (s sanitizací). */
    public updateWebhookApiKey(apiKey: string) {
        const auth = this.getWebhookAuth();
        auth.apiKey = Validators.sanitizeText(apiKey, 256);
        this.updateWebhookAuth(auth);
    }

    /** Aktualizuje HMAC secret webhooků (s sanitizací). */
    public updateWebhookHmacSecret(secret: string) {
        const auth = this.getWebhookAuth();
        auth.hmacSecret = Validators.sanitizeText(secret, 256);
        this.updateWebhookAuth(auth);
    }

    /** Zapne nebo vypne HMAC podpis webhooků. */
    public updateWebhookUseHmac(useHmac: boolean) {
        const auth = this.getWebhookAuth();
        auth.useHmac = useHmac;
        this.updateWebhookAuth(auth);
    }

    /**
     * Importuje celé nastavení ze zálohy (backup/restore).
     * Neplatná/chybějící pole se doplní výchozími hodnotami.
     * @returns true, pokud bylo nastavení uloženo.
     */
    public importSettings(settings: any): boolean {
        if (!settings || typeof settings !== 'object') {
            return false;
        }
        const merged: AppSettings = {
            ...this.DEFAULT_SETTINGS,
            ...settings,
            actions: Array.isArray(settings.actions) ? settings.actions : this.DEFAULT_SETTINGS.actions,
            wakePhrases: Array.isArray(settings.wakePhrases) ? settings.wakePhrases : this.DEFAULT_SETTINGS.wakePhrases
        };
        this.saveSettings(merged);
        return true;
    }
}

