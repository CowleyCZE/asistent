import { Observable } from '@nativescript/core';
import { LazyNavigator } from './utils/navigation';
import { SpeechRecognitionService } from './services/speech-recognition.service';
import { TranslatorService } from './services/translator.service';
import { PermissionsService } from './services/permissions.service';
import { FeedbackService } from './services/feedback.service';
import { ConnectivityService } from './services/connectivity.service';
import { serviceLocator, ServiceTokens } from './services/service-locator';
import { IAssistantService, ISettingsService, INotificationService } from './services/service-interfaces';
import { themeService } from './app';

/**
 * View-model hlavní stránky.
 *
 * Řídí celý hlasový tok: detekci aktivační fráze, poslech příkazu,
 * zpracování přes AssistantService a aktualizaci stavu do UI.
 * Služby získává přes ServiceLocator (Dependency Injection).
 */
export class MainViewModel extends Observable {
    private speechService: SpeechRecognitionService;
    private translatorService: TranslatorService;
    private assistantService: IAssistantService;
    private permissionsService: PermissionsService;
    private settingsService: ISettingsService;
    private feedbackService: FeedbackService;
    private notificationService: INotificationService;
    private connectivityService: ConnectivityService;
    
    private _isListening: boolean = false;
    private _status: string = "Kontrola oprávnění...";
    private _recognizedText: string = "";
    private _translatedText: string = "";
    private _hasPermission: boolean = false;
    private _isOffline: boolean = false;
    private _offlineQueueCount: number = 0;

    constructor() {
        super();
        
        // Služby řešíme přes ServiceLocator (Dependency Injection)
        this.speechService = serviceLocator.get<SpeechRecognitionService>(ServiceTokens.SpeechRecognitionService);
        this.translatorService = serviceLocator.get<TranslatorService>(ServiceTokens.TranslatorService);
        this.assistantService = serviceLocator.get<IAssistantService>(ServiceTokens.AssistantService);
        this.permissionsService = serviceLocator.get<PermissionsService>(ServiceTokens.PermissionsService);
        this.settingsService = serviceLocator.get<ISettingsService>(ServiceTokens.SettingsService);
        this.feedbackService = serviceLocator.get<FeedbackService>(ServiceTokens.FeedbackService);
        this.notificationService = serviceLocator.get<INotificationService>(ServiceTokens.NotificationService);
        
        this.checkPermissions();
        this.setupSpeechRecognition();
        this.checkOfflineStatus();

        // Automatické zpracování offline fronty při obnově připojení
        this.connectivityService = serviceLocator.get<ConnectivityService>(ServiceTokens.ConnectivityService);
        this.connectivityService.on('connectionRestored', () => {
            void this.processOfflineQueue();
        });
        this.connectivityService.startMonitoring();
    }

    private checkOfflineStatus() {
        this._isOffline = this.assistantService.isOfflineModeActive();
        this._offlineQueueCount = this.assistantService.getOfflineQueueCount();
        this.notifyPropertyChange('isOffline', this._isOffline);
        this.notifyPropertyChange('offlineQueueCount', this._offlineQueueCount);
    }

    private async checkPermissions() {
        this._hasPermission = await this.permissionsService.checkMicrophonePermission();
        if (!this._hasPermission) {
            this._hasPermission = await this.permissionsService.requestMicrophonePermission();
        }
        
        if (this._hasPermission) {
            this.status = "Čekám na aktivační frázi...";
            this.speechService.startWakeWordDetection();
        } else {
            this.status = "Chybí oprávnění k mikrofonu";
        }
        this.notifyPropertyChange('hasPermission', this._hasPermission);
    }

    private setupSpeechRecognition() {
        this.speechService.on('wakeWordDetected', async () => {
            this.status = "Aktivační fráze rozpoznána!";
            if (this.settingsService.getSettings().feedbackEnabled) {
                await this.feedbackService.playStartSound();
            }
        });

        this.speechService.on('speechResult', async (args: any) => {
            this.recognizedText = args.text;
            this.status = "Překládám...";
            
            if (this.settingsService.getSettings().feedbackEnabled) {
                await this.feedbackService.playStopSound();
            }
            
            // Zpracování příkazu
            this.status = "Zpracovávám příkaz...";
            const success = await this.assistantService.processCommand(args.text);

            if (success) {
                this.status = "Příkaz úspěšně vykonán!";
            } else {
                this.status = "Příkaz se nepodařilo vykonat.";
            }
            
            // Překlad textu (pokud je potřeba)
            // const translated = await this.translatorService.translate(args.text);
            // this.translatedText = translated;

            this.status = "Čekám na aktivační frázi...";
            this.isListening = false;
            this.checkOfflineStatus();
            
            // Obnovení detekce wake word
            setTimeout(() => this.speechService.startWakeWordDetection(), 1000);
        });

        this.speechService.on('speechError', async (args: any) => {
            this.status = "Chyba rozpoznávání řeči";
            this.isListening = false;
            this.checkOfflineStatus();
            
            if (this.settingsService.getSettings().feedbackEnabled) {
                await this.feedbackService.playErrorSound();
            }
            
            // Obnovení detekce wake word
            setTimeout(() => this.speechService.startWakeWordDetection(), 1000);
        });
    }

    get isListening(): boolean {
        return this._isListening;
    }

    set isListening(value: boolean) {
        if (this._isListening !== value) {
            this._isListening = value;
            this.notifyPropertyChange('isListening', value);
        }
    }

    get status(): string {
        return this._status;
    }

    set status(value: string) {
        if (this._status !== value) {
            this._status = value;
            this.notifyPropertyChange('status', value);
        }
    }

    get recognizedText(): string {
        return this._recognizedText;
    }

    set recognizedText(value: string) {
        if (this._recognizedText !== value) {
            this._recognizedText = value;
            this.notifyPropertyChange('recognizedText', value);
        }
    }

    get translatedText(): string {
        return this._translatedText;
    }

    set translatedText(value: string) {
        if (this._translatedText !== value) {
            this._translatedText = value;
            this.notifyPropertyChange('translatedText', value);
        }
    }

    get hasPermission(): boolean {
        return this._hasPermission;
    }

    get isOffline(): boolean {
        return this._isOffline;
    }

    set isOffline(value: boolean) {
        if (this._isOffline !== value) {
            this._isOffline = value;
            this.notifyPropertyChange('isOffline', value);
        }
    }

    get offlineQueueCount(): number {
        return this._offlineQueueCount;
    }

    set offlineQueueCount(value: number) {
        if (this._offlineQueueCount !== value) {
            this._offlineQueueCount = value;
            this.notifyPropertyChange('offlineQueueCount', value);
        }
    }

    get themeService() {
        return themeService;
    }

    /** Přepne poslouchání řeči (start/stop) a přehraje zpětnou vazbu. */
    public async toggleListening() {
        if (!this._hasPermission) {
            await this.checkPermissions();
            if (!this._hasPermission) {
                return;
            }
        }

        if (this.isListening) {
            this.speechService.stopListening();
            this.status = "Zastaveno";
            if (this.settingsService.getSettings().feedbackEnabled) {
                await this.feedbackService.playStopSound();
            }
        } else {
            this.speechService.startListening();
            this.status = "Poslouchám...";
            if (this.settingsService.getSettings().feedbackEnabled) {
                await this.feedbackService.playStartSound();
            }
        }
        this.isListening = !this.isListening;
    }

    /** Otevře stránku nastavení (lazy loading přes LazyNavigator). */
    public showSettings() {
        // Lazy loading – stránka nastavení se (včetně view-modelu a služeb)
        // načte až při první navigaci
        LazyNavigator.navigate("settings-page");
    }

    /** Zpracuje čekající offline frontu a notifikuje výsledek. */
    public async processOfflineQueue() {
        this.status = "Zpracovávám offline frontu...";
        const result = await this.assistantService.processOfflineQueue();
        this.status = `Zpracováno: ${result.processed}, Selhalo: ${result.failed}`;
        this.checkOfflineStatus();
        
        if (this.notificationService.isEnabled()) {
            if (result.processed > 0) {
                this.notificationService.showSuccess(
                    'Offline fronta',
                    `Zpracováno ${result.processed} příkazů z fronty.`
                );
            }
            if (result.failed > 0) {
                this.notificationService.showError(
                    'Offline fronta',
                    `${result.failed} příkazů se nepodařilo zpracovat.`
                );
            }
        }
    }
}
