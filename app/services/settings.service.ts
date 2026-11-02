import { ApplicationSettings } from '@nativescript/core';

export type ActionType = 'webhook' | 'tasker';

export interface Action {
    name: string;
    phrase: string;
    type: ActionType;
    url?: string; // Pro webhooky
    taskName?: string; // Pro Tasker
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
    webhookAuth?: WebhookAuth;
}

export class SettingsService {
    private readonly SETTINGS_KEY = 'voice_assistant_settings_v2'; // Změna klíče pro migraci
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
        const oldSettingsKey = 'voice_assistant_settings';
        const oldSettings = ApplicationSettings.getString(oldSettingsKey);
        if (oldSettings) {
            const parsedOld = JSON.parse(oldSettings);
            if (parsedOld.webhooks) {
                const newActions: Action[] = parsedOld.webhooks.map(wh => ({
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

    public getSettings(): AppSettings {
        const settings = ApplicationSettings.getString(this.SETTINGS_KEY);
        if (settings) {
            const parsed = JSON.parse(settings);
            if (!parsed.actions) {
                parsed.actions = this.DEFAULT_SETTINGS.actions;
            }
            return parsed;
        }
        return this.DEFAULT_SETTINGS;
    }

    private saveSettings(settings: AppSettings) {
        ApplicationSettings.setString(this.SETTINGS_KEY, JSON.stringify(settings));
    }

    public updateWakePhrases(phrases: string[]) {
        const settings = this.getSettings();
        settings.wakePhrases = phrases;
        this.saveSettings(settings);
    }

    public updateFeedback(enabled: boolean) {
        const settings = this.getSettings();
        settings.feedbackEnabled = enabled;
        this.saveSettings(settings);
    }

    public updateSensitivity(value: number) {
        const settings = this.getSettings();
        settings.sensitivity = value;
        this.saveSettings(settings);
    }

    public getActions(): Action[] {
        return this.getSettings().actions;
    }

    public addAction(action: Action) {
        const settings = this.getSettings();
        settings.actions.push(action);
        this.saveSettings(settings);
    }

    public updateAction(index: number, action: Action) {
        const settings = this.getSettings();
        if (index >= 0 && index < settings.actions.length) {
            settings.actions[index] = action;
            this.saveSettings(settings);
        }
    }

    public deleteAction(index: number) {
        const settings = this.getSettings();
        if (index >= 0 && index < settings.actions.length) {
            settings.actions.splice(index, 1);
            this.saveSettings(settings);
        }
    }

    // TTS Settings
    public updateTTSEnabled(enabled: boolean) {
        const settings = this.getSettings();
        settings.ttsEnabled = enabled;
        this.saveSettings(settings);
    }

    public updateTTSLanguage(language: string) {
        const settings = this.getSettings();
        settings.ttsLanguage = language;
        this.saveSettings(settings);
    }

    public updateTTSPitch(pitch: number) {
        const settings = this.getSettings();
        settings.ttsPitch = Math.max(0.5, Math.min(2.0, pitch));
        this.saveSettings(settings);
    }

    public updateTTSRate(rate: number) {
        const settings = this.getSettings();
        settings.ttsRate = Math.max(0.5, Math.min(2.0, rate));
        this.saveSettings(settings);
    }

    public getTTSConfig() {
        const settings = this.getSettings();
        return {
            enabled: settings.ttsEnabled,
            language: settings.ttsLanguage,
            pitch: settings.ttsPitch,
            rate: settings.ttsRate
        };
    }

    // Webhook Auth Settings
    public getWebhookAuth(): WebhookAuth {
        const settings = this.getSettings();
        return settings.webhookAuth || { apiKey: '', hmacSecret: '', useHmac: false };
    }

    public updateWebhookAuth(auth: WebhookAuth) {
        const settings = this.getSettings();
        settings.webhookAuth = auth;
        this.saveSettings(settings);
    }

    public updateWebhookApiKey(apiKey: string) {
        const auth = this.getWebhookAuth();
        auth.apiKey = apiKey;
        this.updateWebhookAuth(auth);
    }

    public updateWebhookHmacSecret(secret: string) {
        const auth = this.getWebhookAuth();
        auth.hmacSecret = secret;
        this.updateWebhookAuth(auth);
    }

    public updateWebhookUseHmac(useHmac: boolean) {
        const auth = this.getWebhookAuth();
        auth.useHmac = useHmac;
        this.updateWebhookAuth(auth);
    }
}