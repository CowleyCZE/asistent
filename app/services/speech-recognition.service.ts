import { AndroidApplication, Application } from '@nativescript/core';
import { Observable } from '@nativescript/core';
declare var android: any;
declare var java: any;
import { SettingsService } from './settings.service';
import { WakeWordMatcher } from '../utils/wake-word.utils';

/** Závislosti pro constructor injection (testy / serviceLocator). */
export interface SpeechRecognitionServiceDeps {
    settingsService?: SettingsService;
}

/** Rozpoznávání řeči (Android SpeechRecognizer) včetně wake word detekce. */
export class SpeechRecognitionService extends Observable {
    private speechRecognizer: any;
    private isListening: boolean = false;
    private settingsService: SettingsService;
    private continuousListening: boolean = false;
    private continuousMode: boolean = false; // automatický restart poslechu po každém výsledku

    // --- Ochrana proti nekonečné chybové smyčce v wake word detekci ---
    /** Počet chyb v řadě bez úspěšného výsledku. */
    private consecutiveErrors: number = 0;
    /** Timer naplánovaného restartu poslechu (aby šel zrušit při stop/dispose). */
    private retryTimer: any = undefined;

    /** Maximální počet chyb v řadě, než se wake word detekce zastaví. */
    private static readonly MAX_CONSECUTIVE_ERRORS = 5;
    /** Základní zpoždění restartu poslechu po chybě (ms). */
    private static readonly BASE_RETRY_DELAY_MS = 1000;
    /** Maximální zpoždění restartu (exponenciální backoff je omezen) (ms). */
    private static readonly MAX_RETRY_DELAY_MS = 30000;
    /**
     * Chyby, po kterých nemá smysl restartovat poslech:
     * 5 = ERROR_CLIENT, 8 = ERROR_RECOGNIZER_BUSY, 9 = ERROR_INSUFFICIENT_PERMISSIONS.
     */
    private static readonly FATAL_ERRORS: number[] = [5, 8, 9];

    constructor(deps: SpeechRecognitionServiceDeps = {}) {
        super();
        // Constructor injection – služba dostává sdílenou instanci
        // SettingsService (dříve vždy vlastní `new`, takže nastavení
        // četlo více instancí téže služby současně).
        this.settingsService = deps.settingsService ?? new SettingsService();
        this.initializeSpeechRecognizer();
        // POZOR: wake word detekci nespouštíme v konstruktoru – SpeechRecognizer
        // bez uděleného oprávnění k mikrofonu by jen vykával chybovou smyčku.
        // Start zajišťuje MainViewModel po udělení oprávnění.
        //
        // Registraci pro cleanup při exitu provádí serviceLocator
        // automaticky při vytvoření singletonu (viz ServiceLocator.get).
    }

    private initializeSpeechRecognizer() {
        if (Application.android && Application.android.context) {
            const context = Application.android.context;
            // Rozpoznávání řeči nemusí být na zařízení dostupné
            if (android.speech.SpeechRecognizer.isRecognitionAvailable &&
                !android.speech.SpeechRecognizer.isRecognitionAvailable(context)) {
                console.warn('Rozpoznávání řeči není na tomto zařízení dostupné.');
                return;
            }
            // Doporučený factory přístup místo přímého konstruktoru
            this.speechRecognizer = android.speech.SpeechRecognizer.createSpeechRecognizer
                ? android.speech.SpeechRecognizer.createSpeechRecognizer(context)
                : new android.speech.SpeechRecognizer(context);
            
            const recognitionListener = new android.speech.RecognitionListener({
                onResults: (results: any) => {
                    // Úspěšný výsledek resetuje počítadlo chyb
                    this.consecutiveErrors = 0;
                    const matches = results.getStringArrayList(android.speech.SpeechRecognizer.RESULTS_RECOGNITION);
                    if (matches && matches.size() > 0) {
                        const recognizedText = matches.get(0);
                        
                        if (this.continuousListening) {
                            // Kontrola wake phrases
                            const settings = this.settingsService.getSettings();
                            // Fuzzy detekce wake word (normalizace + tolerance 1 chyby)
                            const isWakePhrase = WakeWordMatcher.matches(recognizedText, settings.wakePhrases);

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

                            // Continuous listening: po výsledku automaticky restartujeme poslech
                            if (this.continuousMode) {
                                this.isListening = false;
                                setTimeout(() => this.startListening(), 300);
                            }
                        }
                    }
                },
                onError: (error: number) => {
                    // Po chybě recognizer není ve stavu poslechu – resetujeme příznak,
                    // aby bylo možné poslech restartovat.
                    this.isListening = false;
                    if (this.continuousListening) {
                        this.handleWakeWordError(error);
                    } else {
                        this.notify({
                            eventName: 'speechError',
                            object: this,
                            error: error
                        });
                    }
                },
                onPartialResults: (partialResults: any) => {
                    if (this.continuousListening) {
                        try {
                            const partial = partialResults?.getStringArrayList?.(
                                android.speech.SpeechRecognizer.RESULTS_RECOGNITION
                            );
                            if (partial && partial.size() > 0) {
                                const partialText = partial.get(0);
                                const wakePhrases = this.settingsService.getSettings().wakePhrases;
                                // Rychlejší detekce: wake word poznáme už z parciálního výsledku
                                if (WakeWordMatcher.matches(partialText, wakePhrases)) {
                                    this.consecutiveErrors = 0;
                                    this.stopListening();
                                    this.notify({
                                        eventName: 'wakeWordDetected',
                                        object: this
                                    });
                                    setTimeout(() => this.startListening(), 500);
                                }
                            }
                        } catch (error) {
                            console.error('Chyba při zpracování parciálních výsledků:', error);
                        }
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

    /**
     * Ošetření chyby v režimu detekce wake word.
     *
     * Dřívější chování (okamžitý restart po 1 s bez limitu) vedlo
     * u trvalých chyb (RECOGNIZER_BUSY, INSUFFICIENT_PERMISSIONS apod.)
     * k tiché nekonečné smyčce a drenži baterie.
     *
     * Nyní platí:
     * - fatální chyby (client/busy/permissions) smyčku rovnou zastaví
     *   a chybu nahlásí odběratelům (speechError),
     * - ostatní chyby se restartují s exponenciálním backoffem
     *   (1 s, 2 s, 4 s, 8 s, 16 s… max 30 s),
     * - po MAX_CONSECUTIVE_ERRORS chybách v řadě se detekce zastaví.
     */
    private handleWakeWordError(error: number): void {
        this.consecutiveErrors++;

        const isFatal = SpeechRecognitionService.FATAL_ERRORS.indexOf(error) !== -1;
        if (isFatal) {
            console.warn(`Wake word detekce zastavena – fatální chyba SpeechRecognizeru (${error}).`);
            this.stopWakeWordDetection();
            this.notify({
                eventName: 'speechError',
                object: this,
                error: error
            });
            return;
        }

        if (this.consecutiveErrors > SpeechRecognitionService.MAX_CONSECUTIVE_ERRORS) {
            console.warn(
                `Wake word detekce zastavena – ${this.consecutiveErrors - 1} chyb v řadě (poslední: ${error}).`
            );
            this.stopWakeWordDetection();
            this.notify({
                eventName: 'speechError',
                object: this,
                error: error
            });
            return;
        }

        // Exponenciální backoff: 1s, 2s, 4s, 8s, 16s … max 30s
        const delay = Math.min(
            SpeechRecognitionService.BASE_RETRY_DELAY_MS * Math.pow(2, this.consecutiveErrors - 1),
            SpeechRecognitionService.MAX_RETRY_DELAY_MS
        );
        console.warn(
            `Chyba wake word detekce (${error}), pokus ${this.consecutiveErrors}/${SpeechRecognitionService.MAX_CONSECUTIVE_ERRORS} – restart za ${delay} ms.`
        );

        this.cancelRetryTimer();
        this.retryTimer = setTimeout(() => {
            this.retryTimer = undefined;
            // Restart jen pokud je stále aktivní režim detekce wake word
            // (mezitím mohl přijít stopListening/startListening).
            if (this.continuousListening) {
                this.startWakeWordDetection();
            }
        }, delay);
    }

    /** Zruší naplánovaný restart poslechu. */
    private cancelRetryTimer(): void {
        if (this.retryTimer !== undefined) {
            clearTimeout(this.retryTimer);
            this.retryTimer = undefined;
        }
    }

    /** Zastaví režim detekce wake word včetně čekajícího restartu. */
    private stopWakeWordDetection(): void {
        this.continuousListening = false;
        this.isListening = false;
        this.consecutiveErrors = 0;
        this.cancelRetryTimer();
    }

    /** Zapne nebo vypne kontinuální režim – poslech se po každém výsledku automaticky restartuje. */
    public setContinuousListening(enabled: boolean) {
        this.continuousMode = enabled;
    }

    /** Zjistí, zda je zapnut kontinuální režim poslechu. */
    public isContinuousListeningEnabled(): boolean {
        return this.continuousMode;
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
        if (Application.android && this.speechRecognizer && !this.isListening) {
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
        if (Application.android && this.speechRecognizer && !this.isListening) {
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
        if (this.isListening && this.speechRecognizer) {
            this.speechRecognizer.stopListening();
            this.isListening = false;
            this.continuousListening = false;
            this.cancelRetryTimer();
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
        this.cancelRetryTimer();
        this.stopListening();
        this.destroy();
    }
}

