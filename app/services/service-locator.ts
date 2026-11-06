/**
 * ServiceLocator - centrální přístupový bod ke službám,
 * postavený nad DIContainerem. Instance jsou singletony.
 */
import { DIContainer } from './di-container';
import { SettingsService } from './settings.service';
import { TaskerService } from './tasker.service';
import { HistoryService } from './history.service';
import { TextToSpeechService } from './text-to-speech.service';
import { CacheService } from './cache.service';
import { OfflineService } from './offline.service';
import { NotificationService } from './notification.service';
import { AssistantService } from './assistant.service';
import { SpeechRecognitionService } from './speech-recognition.service';
import { TranslatorService } from './translator.service';
import { PermissionsService } from './permissions.service';
import { FeedbackService } from './feedback.service';
import { ConnectivityService } from './connectivity.service';
import { ThemeService } from './theme.service';
import { serviceRegistry } from './service-registry';

/** Tokeny služeb (typově bezpečné klíče) */
export const ServiceTokens = {
    SettingsService: 'SettingsService',
    TaskerService: 'TaskerService',
    HistoryService: 'HistoryService',
    TextToSpeechService: 'TextToSpeechService',
    CacheService: 'CacheService',
    OfflineService: 'OfflineService',
    NotificationService: 'NotificationService',
    AssistantService: 'AssistantService',
    SpeechRecognitionService: 'SpeechRecognitionService',
    TranslatorService: 'TranslatorService',
    PermissionsService: 'PermissionsService',
    FeedbackService: 'FeedbackService',
    ConnectivityService: 'ConnectivityService',
    ThemeService: 'ThemeService'
} as const;

export class ServiceLocator {
    private container: DIContainer;
    /** Tokeny už zaregistrované pro cleanup (jednorázová registrace). */
    private cleanupRegistered: Set<string> = new Set();

    constructor() {
        this.container = new DIContainer();
        this.registerDefaults();
    }

    /** Zaregistruje výchozí implementace služeb */
    private registerDefaults(): void {
        // Sdílená instance SettingsService – všechny služby, které ji
        // vyžadují, ji dostanou injekcí (dříve si každá vytvářela
        // vlastní `new SettingsService()`).
        this.container.register(ServiceTokens.SettingsService, () => new SettingsService());
        this.container.register(ServiceTokens.TaskerService, () => new TaskerService());
        this.container.register(ServiceTokens.HistoryService, () => new HistoryService());
        this.container.register(ServiceTokens.TextToSpeechService, () =>
            new TextToSpeechService({ settingsService: this.get(ServiceTokens.SettingsService) }));
        this.container.register(ServiceTokens.CacheService, () => new CacheService());
        this.container.register(ServiceTokens.OfflineService, () => new OfflineService());
        this.container.register(ServiceTokens.NotificationService, () => new NotificationService());
        this.container.register(ServiceTokens.AssistantService, () =>
            new AssistantService({
                settingsService: this.get(ServiceTokens.SettingsService),
                ttsService: this.get(ServiceTokens.TextToSpeechService)
            }));
        this.container.register(ServiceTokens.SpeechRecognitionService, () =>
            new SpeechRecognitionService({ settingsService: this.get(ServiceTokens.SettingsService) }));
        this.container.register(ServiceTokens.TranslatorService, () => new TranslatorService());
        this.container.register(ServiceTokens.PermissionsService, () => new PermissionsService());
        this.container.register(ServiceTokens.FeedbackService, () => new FeedbackService());
        this.container.register(ServiceTokens.ConnectivityService, () => new ConnectivityService());
        this.container.register(ServiceTokens.ThemeService, () => new ThemeService());
    }

    /**
     * Získá službu podle tokenu (singleton).
     *
     * Služby implementující IDisposable (dispose()) se při prvním
     * vytvoření automaticky registrují do serviceRegistry pro cleanup
     * při ukončení aplikace – služby se tak nemusí samy registrovat
     * ve svých konstruktorech a registrace je na jednom místě.
     */
    public get<T>(token: string): T {
        const instance = this.container.resolve<T>(token);
        if (
            !this.cleanupRegistered.has(token) &&
            instance &&
            typeof (instance as any).dispose === 'function'
        ) {
            this.cleanupRegistered.add(token);
            serviceRegistry.register(instance as any);
        }
        return instance;
    }

    /** Přepíše registraci (testy / alternativní implementace) */
    public override<T>(token: string, factory: () => T, singleton: boolean = true): void {
        this.container.override(token, factory, singleton);
    }
}

// Globální singleton
export const serviceLocator = new ServiceLocator();


