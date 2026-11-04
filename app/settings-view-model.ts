import { Observable, Frame } from '@nativescript/core';
import { SettingsService, Action, ActionType } from './services/settings.service';
import { TextToSpeechService } from './services/text-to-speech.service';
import { ThemeService } from './services/theme.service';

/**
 * View-model stránky nastavení.
 *
 * Spravuje aktivační fráze, akce (webhook/tasker), TTS konfiguraci
 * a motiv aplikace; změny se okamžitě ukládají přes služby.
 */
export class SettingsViewModel extends Observable {
    private settingsService: SettingsService;
    private ttsService: TextToSpeechService;
    public themeService: ThemeService;

    // Stávající vlastnosti
    private _currentPhrase: string = '';
    private _wakePhrases: string[] = [];
    private _feedbackEnabled: boolean = true;
    private _sensitivity: number = 0.5;

    // Vlastnosti pro akce
    private _actions: Action[] = [];
    private _newActionName: string = '';
    private _newActionPhrase: string = '';
    private _newActionUrl: string = '';
    private _newActionTaskName: string = '';
    private _newActionType: ActionType = 'webhook'; // Výchozí typ

    // TTS vlastnosti
    private _ttsEnabled: boolean = true;
    private _ttsLanguage: string = 'cs-CZ';
    private _ttsPitch: number = 1.0;
    private _ttsRate: number = 1.0;
    private _availableLanguages: string[] = [];

    // Theme vlastnosti
    private _themeModes: { label: string; value: 'light' | 'dark' | 'system' }[] = [
        { label: 'Systém', value: 'system' },
        { label: 'Světlý', value: 'light' },
        { label: 'Tmavý', value: 'dark' }
    ];

    constructor() {
        super();
        this.settingsService = new SettingsService();
        this.ttsService = new TextToSpeechService();
        this.themeService = new ThemeService();
        this.loadSettings();
        this.loadAvailableLanguages();
    }

    private loadSettings() {
        const settings = this.settingsService.getSettings();
        this.wakePhrases = [...settings.wakePhrases];
        this.feedbackEnabled = settings.feedbackEnabled;
        this.sensitivity = settings.sensitivity;
        this.actions = [...settings.actions];
        
        // Load TTS settings
        this.ttsEnabled = settings.ttsEnabled;
        this.ttsLanguage = settings.ttsLanguage;
        this.ttsPitch = settings.ttsPitch;
        this.ttsRate = settings.ttsRate;
    }

    private loadAvailableLanguages() {
        try {
            this._availableLanguages = this.ttsService.getAvailableLanguages();
        } catch (error) {
            console.error('Error loading available languages:', error);
            this._availableLanguages = ['cs-CZ', 'en-US', 'sk-SK', 'de-DE', 'fr-FR'];
        }
    }

    // Gettery a Settery pro stávající vlastnosti
    get currentPhrase(): string { return this._currentPhrase; }
    set currentPhrase(value: string) {
        if (this._currentPhrase !== value) {
            this._currentPhrase = value;
            this.notifyPropertyChange('currentPhrase', value);
        }
    }

    get wakePhrases(): string[] { return this._wakePhrases; }
    set wakePhrases(value: string[]) {
        this._wakePhrases = value;
        this.notifyPropertyChange('wakePhrases', value);
    }

    get feedbackEnabled(): boolean { return this._feedbackEnabled; }
    set feedbackEnabled(value: boolean) {
        if (this._feedbackEnabled !== value) {
            this._feedbackEnabled = value;
            this.settingsService.updateFeedback(value);
            this.notifyPropertyChange('feedbackEnabled', value);
        }
    }

    get sensitivity(): number { return this._sensitivity; }
    set sensitivity(value: number) {
        if (this._sensitivity !== value) {
            this._sensitivity = value;
            this.settingsService.updateSensitivity(value);
            this.notifyPropertyChange('sensitivity', value);
        }
    }

    // Gettery a Settery pro akce
    get actions(): Action[] { return this._actions; }
    set actions(value: Action[]) {
        this._actions = value;
        this.notifyPropertyChange('actions', value);
    }

    get newActionName(): string { return this._newActionName; }
    set newActionName(value: string) {
        this._newActionName = value;
        this.notifyPropertyChange('newActionName', value);
    }

    get newActionPhrase(): string { return this._newActionPhrase; }
    set newActionPhrase(value: string) {
        this._newActionPhrase = value;
        this.notifyPropertyChange('newActionPhrase', value);
    }

    get newActionUrl(): string { return this._newActionUrl; }
    set newActionUrl(value: string) {
        this._newActionUrl = value;
        this.notifyPropertyChange('newActionUrl', value);
    }

    get newActionTaskName(): string { return this._newActionTaskName; }
    set newActionTaskName(value: string) {
        this._newActionTaskName = value;
        this.notifyPropertyChange('newActionTaskName', value);
    }

    get newActionType(): ActionType { return this._newActionType; }
    set newActionType(value: ActionType) {
        if (this._newActionType !== value) {
            this._newActionType = value;
            this.notifyPropertyChange('newActionType', value);
        }
    }

    // TTS Gettery a Settery
    get ttsEnabled(): boolean { return this._ttsEnabled; }
    set ttsEnabled(value: boolean) {
        if (this._ttsEnabled !== value) {
            this._ttsEnabled = value;
            this.settingsService.updateTTSEnabled(value);
            this.ttsService.setEnabled(value);
            this.notifyPropertyChange('ttsEnabled', value);
        }
    }

    get ttsLanguage(): string { return this._ttsLanguage; }
    set ttsLanguage(value: string) {
        if (this._ttsLanguage !== value) {
            this._ttsLanguage = value;
            this.settingsService.updateTTSLanguage(value);
            this.ttsService.setLanguage(value);
            this.notifyPropertyChange('ttsLanguage', value);
        }
    }

    get ttsPitch(): number { return this._ttsPitch; }
    set ttsPitch(value: number) {
        if (this._ttsPitch !== value) {
            this._ttsPitch = value;
            this.settingsService.updateTTSPitch(value);
            this.ttsService.setPitch(value);
            this.notifyPropertyChange('ttsPitch', value);
        }
    }

    get ttsRate(): number { return this._ttsRate; }
    set ttsRate(value: number) {
        if (this._ttsRate !== value) {
            this._ttsRate = value;
            this.settingsService.updateTTSRate(value);
            this.ttsService.setRate(value);
            this.notifyPropertyChange('ttsRate', value);
        }
    }

    get availableLanguages(): string[] { return this._availableLanguages; }

    // Theme Gettery
    get themeModes(): { label: string; value: 'light' | 'dark' | 'system' }[] {
        return this._themeModes;
    }

    get currentThemeMode(): 'light' | 'dark' | 'system' {
        return this.themeService.getMode();
    }

    set currentThemeMode(value: 'light' | 'dark' | 'system') {
        this.themeService.setMode(value);
        this.themeService.applyTheme();
        this.notifyPropertyChange('currentThemeMode', value);
    }

    /** Vysoký kontrast (přepínač v Nastavení > Vzhled). */
    get highContrast(): boolean {
        return this.themeService.isHighContrastEnabled();
    }

    set highContrast(value: boolean) {
        this.themeService.setHighContrast(value);
        this.themeService.applyTheme();
        this.notifyPropertyChange('highContrast', value);
    }

    // Metody pro správu
    /** Přidá aktuálně zadanou frázi do seznamu aktivačních frází. */
    public addPhrase() {
        if (this.currentPhrase && !this.wakePhrases.includes(this.currentPhrase)) {
            const updatedPhrases = [...this.wakePhrases, this.currentPhrase];
            this.settingsService.updateWakePhrases(updatedPhrases);
            this.wakePhrases = updatedPhrases;
            this.currentPhrase = '';
        }
    }

    /** Odebere frázi (args.object.bindingContext) ze seznamu. */
    public removePhrase(args: any) {
        const phraseToRemove = args.object.bindingContext;
        const updatedPhrases = this.wakePhrases.filter(p => p !== phraseToRemove);
        this.settingsService.updateWakePhrases(updatedPhrases);
        this.wakePhrases = updatedPhrases;
    }

    /** Přidá novou akci z formuláře (webhook s URL / tasker s názvem úlohy). */
    public addAction() {
        const isWebhookValid = this.newActionType === 'webhook' && this.newActionUrl;
        const isTaskerValid = this.newActionType === 'tasker' && this.newActionTaskName;

        if (this.newActionName && this.newActionPhrase && (isWebhookValid || isTaskerValid)) {
            const newAction: Action = {
                name: this.newActionName,
                phrase: this.newActionPhrase,
                type: this.newActionType,
                url: this.newActionType === 'webhook' ? this.newActionUrl : undefined,
                taskName: this.newActionType === 'tasker' ? this.newActionTaskName : undefined,
            };
            this.settingsService.addAction(newAction);
            this.actions = [...this.settingsService.getActions()];

            // Vyčistíme formulář
            this.newActionName = '';
            this.newActionPhrase = '';
            this.newActionUrl = '';
            this.newActionTaskName = '';
        }
    }

    /** Odebere akci (args.object.bindingContext) ze seznamu. */
    public removeAction(args: any) {
        const actionToRemove = args.object.bindingContext;
        const index = this.actions.findIndex(a => a === actionToRemove);
        if (index !== -1) {
            this.settingsService.deleteAction(index);
            this.actions = [...this.settingsService.getActions()];
        }
    }

    /** Otevře stránku historie příkazů. */
    public showHistory() {
        Frame.topmost().navigate({
            moduleName: "history-page",
            transition: {
                name: "slide"
            }
        });
    }

    /** Otevře stránku statistik. */
    public showStatistics() {
        Frame.topmost().navigate({
            moduleName: "statistics-page",
            transition: {
                name: "slide"
            }
        });
    }

    /** Přečte testovací zprávu přes TTS (pokud je povoleno). */
    public testTTS() {
        if (this.ttsEnabled) {
            this.ttsService.speak("Test hlasové zpětné vazby. Tohle je testovací zpráva.");
        }
    }

    /** Přepne mezi světlým a tmavým motivem. */
    public toggleTheme() {
        this.themeService.toggleTheme();
        this.themeService.applyTheme();
        this.notifyPropertyChange('themeService', this.themeService);
        this.notifyPropertyChange('currentThemeMode', this.themeService.getMode());
    }

    /** Nastaví explicitní režim motivu. */
    public setThemeMode(mode: 'light' | 'dark' | 'system') {
        this.currentThemeMode = mode;
    }
}
