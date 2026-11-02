import { ApplicationSettings } from '@nativescript/core';
import { SettingsService } from './settings.service';
import { serviceRegistry } from './service-registry';

export interface TTSConfig {
    enabled: boolean;
    language: string;
    pitch: number; // 0.5 - 2.0
    rate: number;  // 0.5 - 2.0
    volume: number; // 0.0 - 1.0
}

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
            if (global.android) {
                const TextToSpeech = android.speech.tts.TextToSpeech;
                const context = global.android.context || android.app.Application.getNativeApplication();

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

    public isEnabled(): boolean {
        return this.settingsService.getTTSConfig().enabled;
    }

    public setEnabled(enabled: boolean) {
        this.settingsService.updateTTSEnabled(enabled);
    }

    public setLanguage(language: string) {
        this.settingsService.updateTTSLanguage(language);
    }

    public setPitch(pitch: number) {
        this.settingsService.updateTTSPitch(Math.max(0.5, Math.min(2.0, pitch)));
    }

    public setRate(rate: number) {
        this.settingsService.updateTTSRate(Math.max(0.5, Math.min(2.0, rate)));
    }

    public setVolume(volume: number) {
        this.saveConfig({ volume: Math.max(0.0, Math.min(1.0, volume)) });
    }

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

    public async speakWithConfig(text: string, pitch?: number, rate?: number): Promise<boolean> {
        if (pitch !== undefined) {
            this.setPitch(pitch);
        }
        if (rate !== undefined) {
            this.setRate(rate);
        }
        return this.speak(text);
    }

    public stop() {
        if (this.ttsEngine && this.isInitialized) {
            try {
                this.ttsEngine.stop();
            } catch (error) {
                console.error('Error stopping TTS:', error);
            }
        }
    }

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

    public dispose(): void {
        this.stop();
        this.shutdown();
    }

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

    public isLanguageAvailable(language: string): boolean {
        const available = this.getAvailableLanguages();
        return available.includes(language) || available.includes(language.split('-')[0]);
    }
}
