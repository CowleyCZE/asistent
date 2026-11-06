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

    constructor() {
        this.container = new DIContainer();
        this.registerDefaults();
    }

    /** Zaregistruje výchozí implementace služeb */
    private registerDefaults(): void {
        this.container.register(ServiceTokens.SettingsService, () => new SettingsService());
        this.container.register(ServiceTokens.TaskerService, () => new TaskerService());
        this.container.register(ServiceTokens.HistoryService, () => new HistoryService());
        this.container.register(ServiceTokens.TextToSpeechService, () => new TextToSpeechService());
        this.container.register(ServiceTokens.CacheService, () => new CacheService());
        this.container.register(ServiceTokens.OfflineService, () => new OfflineService());
        this.container.register(ServiceTokens.NotificationService, () => new NotificationService());
        this.container.register(ServiceTokens.AssistantService, () => new AssistantService());
        this.container.register(ServiceTokens.SpeechRecognitionService, () => new SpeechRecognitionService());
        this.container.register(ServiceTokens.TranslatorService, () => new TranslatorService());
        this.container.register(ServiceTokens.PermissionsService, () => new PermissionsService());
        this.container.register(ServiceTokens.FeedbackService, () => new FeedbackService());
        this.container.register(ServiceTokens.ConnectivityService, () => new ConnectivityService());
        this.container.register(ServiceTokens.ThemeService, () => new ThemeService());
    }

    /** Získá službu podle tokenu (singleton) */
    public get<T>(token: string): T {
        return this.container.resolve<T>(token);
    }

    /** Přepíše registraci (testy / alternativní implementace) */
    public override<T>(token: string, factory: () => T, singleton: boolean = true): void {
        this.container.override(token, factory, singleton);
    }
}

// Globální singleton
export const serviceLocator = new ServiceLocator();

