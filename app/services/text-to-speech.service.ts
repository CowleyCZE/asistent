import { Application, ApplicationSettings } from '@nativescript/core';
import { SettingsService } from './settings.service';
declare var android: any;
declare var java: any;
import { serviceRegistry } from './service-registry';

export interface TTSConfig {
    enabled: boolean;
    language: string;
    pitch: number; // 0.5 - 2.0
    rate: number;  // 0.5 - 2.0
    volume: number; // 0.0 - 1.0
}

/** Hlasová zpětná vazba přes Android TTS engine. */
export class TextToSpeechService {
    private settingsService: SettingsService;
    private ttsEngine: any = null;
    private isInitialized: boolean = false;

    constructor() {
        this.settingsService = new SettingsService();
        this.initialize();
        
        // Register for cleanup on app exit
        serviceRegistry.register(this);
    }

    private initialize() {
        try {
            // Android TTS initialization
            const g: any = global;
            // Context získáváme z NativeScript Application (android.context neexistuje)
            if (g.android && Application.android && Application.android.context) {
                const TextToSpeech = android.speech.tts.TextToSpeech;
                const context = Application.android.context;

                this.ttsEngine = new TextToSpeech(context, (status: number) => {
                    if (status === TextToSpeech.SUCCESS) {
                        this.isInitialized = true;
                        this.setEngineConfig();
                    } else {
                        console.error('TTS initialization failed with status:', status);
                    }
                });
            }
        } catch (error) {
            console.error('Error initializing TTS:', error);
        }
    }

    private setEngineConfig() {
        if (!this.ttsEngine || !this.isInitialized) return;

        try {
            const config = this.settingsService.getTTSConfig();
            
            // Set language
            const locale = new java.util.Locale(config.language);
            this.ttsEngine.setLanguage(locale);

            // Set pitch
            this.ttsEngine.setPitch(config.pitch);

            // Set speech rate
            this.ttsEngine.setSpeechRate(config.rate);

            // Set volume (not directly supported, but we can use audio stream volume)
            // For simplicity, we'll use the default audio stream
        } catch (error) {
            console.error('Error setting TTS config:', error);
        }
    }

    /** Vrací aktuální konfiguraci TTS. */
    public getConfig(): TTSConfig {
        const settingsConfig = this.settingsService.getTTSConfig();
        return {
            enabled: settingsConfig.enabled,
            language: settingsConfig.language,
            pitch: settingsConfig.pitch,
            rate: settingsConfig.rate,
            volume: 1.0
        };
    }

    /** Uloží část konfigurace TTS a znovu nakonfiguruje engine. */
    public saveConfig(config: Partial<TTSConfig>) {
        if (config.enabled !== undefined) {
            this.settingsService.updateTTSEnabled(config.enabled);
        }
        if (config.language !== undefined) {
            this.settingsService.updateTTSLanguage(config.language);
        }
        if (config.pitch !== undefined) {
            this.settingsService.updateTTSPitch(config.pitch);
        }
        if (config.rate !== undefined) {
            this.settingsService.updateTTSRate(config.rate);
        }
        
        // Re-configure the engine if already initialized
        if (this.isInitialized) {
            this.setEngineConfig();
        }
    }

    /** Zjistí, zda je TTS povoleno. */
    public isEnabled(): boolean {
        return this.settingsService.getTTSConfig().enabled;
    }

    /** Povolí nebo zakáže TTS. */
    public setEnabled(enabled: boolean) {
        this.settingsService.updateTTSEnabled(enabled);
    }

    /** Nastaví jazyk TTS. */
    public setLanguage(language: string) {
        this.settingsService.updateTTSLanguage(language);
    }

    /** Nastaví výšku hlasu TTS (0.5–2.0). */
    public setPitch(pitch: number) {
        this.settingsService.updateTTSPitch(Math.max(0.5, Math.min(2.0, pitch)));
    }

    /** Nastaví rychlost řeči TTS (0.5–2.0). */
    public setRate(rate: number) {
        this.settingsService.updateTTSRate(Math.max(0.5, Math.min(2.0, rate)));
    }

    /** Nastaví hlasitost TTS (0.0–1.0). */
    public setVolume(volume: number) {
        this.saveConfig({ volume: Math.max(0.0, Math.min(1.0, volume)) });
    }

    /** Přečte text nahlas.
     * @returns true, pokud bylo čtení úspěšně zahájeno. */
    public async speak(text: string): Promise<boolean> {
        if (!this.getConfig().enabled || !this.isInitialized || !this.ttsEngine) {
            return false;
        }

        return new Promise((resolve) => {
            try {
                const queueMode = android.speech.tts.TextToSpeech.QUEUE_FLUSH;
                const params = new android.os.Bundle();
                
                // Set stream type for volume control
                params.putInt(android.speech.tts.TextToSpeech.Engine.KEY_PARAM_STREAM, 
                    android.media.AudioManager.STREAM_MUSIC);

                const callback = new android.speech.tts.UtteranceProgressListener({
                    onStart: (utteranceId: string) => {},
                    onDone: (utteranceId: string) => {
                        resolve(true);
                    },
                    onError: (utteranceId: string) => {
                        resolve(false);
                    }
                });

                this.ttsEngine.speak(text, queueMode, params, 'utterance_id');
                resolve(true);
            } catch (error) {
                console.error('Error speaking text:', error);
                resolve(false);
            }
        });
    }

    /** Přečte text s volitelnou dočasnou výškou/rychlostí hlasu. */
    public async speakWithConfig(text: string, pitch?: number, rate?: number): Promise<boolean> {
        if (pitch !== undefined) {
            this.setPitch(pitch);
        }
        if (rate !== undefined) {
            this.setRate(rate);
        }
        return this.speak(text);
    }

    /** Zastaví aktuální čtení. */
    public stop() {
        if (this.ttsEngine && this.isInitialized) {
            try {
                this.ttsEngine.stop();
            } catch (error) {
                console.error('Error stopping TTS:', error);
            }
        }
    }

    /** Ukončí TTS engine. */
    public shutdown() {
        if (this.ttsEngine && this.isInitialized) {
            try {
                this.ttsEngine.shutdown();
                this.isInitialized = false;
            } catch (error) {
                console.error('Error shutting down TTS:', error);
            }
        }
    }

    /** Kompletní úklid – zastaví čtení a ukončí engine. */
    public dispose(): void {
        this.stop();
        this.shutdown();
    }

    /** Vrací seznam jazyků dostupných v TTS enginu. */
    public getAvailableLanguages(): string[] {
        if (!this.ttsEngine || !this.isInitialized) {
            return ['cs-CZ', 'en-US', 'sk-SK', 'de-DE', 'fr-FR'];
        }

        try {
            const available = this.ttsEngine.getAvailableLanguages();
            const languages: string[] = [];
            const iterator = available.iterator();

            while (iterator.hasNext()) {
                const locale = iterator.next();
                languages.push(locale.toString());
            }

            return languages;
        } catch (error) {
            console.error('Error getting available languages:', error);
            return ['cs-CZ', 'en-US', 'sk-SK', 'de-DE', 'fr-FR'];
        }
    }

    /** Zjistí, zda je daný jazyk k dispozici v TTS enginu. */
    public isLanguageAvailable(language: string): boolean {
        const available = this.getAvailableLanguages();
        return available.includes(language) || available.includes(language.split('-')[0]);
    }
}
