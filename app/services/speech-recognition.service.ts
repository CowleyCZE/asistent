import { AndroidApplication, Application } from '@nativescript/core';
import { Observable } from '@nativescript/core';
declare var android: any;
declare var java: any;
import { SettingsService } from './settings.service';
import { serviceRegistry } from './service-registry';

/** Rozpoznávání řeči (Android SpeechRecognizer) včetně wake word detekce. */
export class SpeechRecognitionService extends Observable {
    private speechRecognizer: any;
    private isListening: boolean = false;
    private settingsService: SettingsService;
    private continuousListening: boolean = false;

    constructor() {
        super();
        this.settingsService = new SettingsService();
        this.initializeSpeechRecognizer();
        this.startWakeWordDetection();
        
        // Register for cleanup on app exit
        serviceRegistry.register(this);
    }

    private initializeSpeechRecognizer() {
        if (Application.android) {
            const context = Application.android.context;
            this.speechRecognizer = new android.speech.SpeechRecognizer(context);
            
            const recognitionListener = new android.speech.RecognitionListener({
                onResults: (results: any) => {
                    const matches = results.getStringArrayList(android.speech.SpeechRecognizer.RESULTS_RECOGNITION);
                    if (matches && matches.size() > 0) {
                        const recognizedText = matches.get(0);
                        
                        if (this.continuousListening) {
                            // Kontrola wake phrases
                            const settings = this.settingsService.getSettings();
                            const isWakePhrase = settings.wakePhrases.some(phrase => 
                                recognizedText.toLowerCase().includes(phrase.toLowerCase())
                            );

                            if (isWakePhrase) {
                                this.continuousListening = false;
                                this.notify({
                                    eventName: 'wakeWordDetected',
                                    object: this
                                });
                                // Začneme skutečné nahrávání
                                setTimeout(() => this.startListening(), 500);
                            } else {
                                // Pokračujeme v detekci wake word
                                this.startWakeWordDetection();
                            }
                        } else {
                            // Běžné rozpoznávání řeči
                            this.notify({
                                eventName: 'speechResult',
                                object: this,
                                text: recognizedText
                            });
                        }
                    }
                },
                onError: (error: number) => {
                    if (this.continuousListening) {
                        // Při chybě v detekci wake word znovu spustíme poslech
                        setTimeout(() => this.startWakeWordDetection(), 1000);
                    } else {
                        this.notify({
                            eventName: 'speechError',
                            object: this,
                            error: error
                        });
                    }
                },
                onReadyForSpeech: () => {
                    this.notify({
                        eventName: 'readyForSpeech',
                        object: this
                    });
                },
                onEndOfSpeech: () => {
                    this.notify({
                        eventName: 'endOfSpeech',
                        object: this
                    });
                }
            });

            this.speechRecognizer.setRecognitionListener(recognitionListener);
        }
    }

    /** Vrací aktuálně nastavený jazyk rozpoznávání řeči (výchozí cs-CZ). */
    public getRecognitionLanguage(): string {
        try {
            const settings = this.settingsService.getSettings();
            return settings.speechLanguage || 'cs-CZ';
        } catch (error) {
            console.error('Chyba při čtení jazyka rozpoznávání:', error);
            return 'cs-CZ';
        }
    }

    /** Nastaví jazyk rozpoznávání řeči (cs-CZ, en-US, de-DE, sk-SK). */
    public setRecognitionLanguage(language: string) {
        this.settingsService.updateSpeechLanguage(language);
    }

    /** Spustí kontinuální poslech pro detekci wake word frází. */
    public startWakeWordDetection() {
        if (Application.android && !this.isListening) {
            const intent = new android.speech.RecognizerIntent();
            intent.putExtra(android.speech.RecognizerIntent.EXTRA_LANGUAGE, this.getRecognitionLanguage());
            intent.putExtra(android.speech.RecognizerIntent.EXTRA_LANGUAGE_MODEL, 
                          android.speech.RecognizerIntent.LANGUAGE_MODEL_FREE_FORM);
            intent.putExtra(android.speech.RecognizerIntent.EXTRA_PARTIAL_RESULTS, true);
            
            this.continuousListening = true;
            this.speechRecognizer.startListening(intent);
            this.isListening = true;
        }
    }

    /** Spustí jednorázové rozpoznávání řeči (jazyk podle nastavení, výchozí cs-CZ). */
    public startListening() {
        if (Application.android && !this.isListening) {
            const intent = new android.speech.RecognizerIntent();
            intent.putExtra(android.speech.RecognizerIntent.EXTRA_LANGUAGE, this.getRecognitionLanguage());
            intent.putExtra(android.speech.RecognizerIntent.EXTRA_LANGUAGE_MODEL, 
                          android.speech.RecognizerIntent.LANGUAGE_MODEL_FREE_FORM);
            
            this.continuousListening = false;
            this.speechRecognizer.startListening(intent);
            this.isListening = true;
        }
    }

    /** Zastaví aktuální poslech. */
    public stopListening() {
        if (this.isListening) {
            this.speechRecognizer.stopListening();
            this.isListening = false;
            this.continuousListening = false;
        }
    }

    /** Uvolní prostředky SpeechRecognizeru. */
    public destroy() {
        if (this.speechRecognizer) {
            this.speechRecognizer.destroy();
        }
    }

    /** Kompletní úklid – zastaví poslech a zničí recognizer. */
    public dispose(): void {
        this.stopListening();
        this.destroy();
    }
}