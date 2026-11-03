import { Action, SettingsService } from './settings.service';
import { TaskerService } from './tasker.service';
import { HistoryService } from './history.service';
import { TextToSpeechService } from './text-to-speech.service';
import { CacheService } from './cache.service';
import { OfflineService } from './offline.service';
import { NotificationService } from './notification.service';
import { CommandProcessor } from './command-processor';
import { LoggerService } from '../utils/logger';
import {
    ISettingsService,
    ITaskerService,
    IHistoryService,
    ITextToSpeechService,
    ICacheService,
    IOfflineService,
    INotificationService,
    ILoggerService,
    ICommandProcessor,
    IAssistantService
} from './service-interfaces';

/**
 * Závislosti AssistantService pro constructor injection.
 * taskerService/historyService/cacheService se používají jen pro
 * sestavení výchozího CommandProcessoru, pokud není předán.
 */
export interface AssistantServiceDeps {
    settingsService?: ISettingsService;
    taskerService?: ITaskerService;
    historyService?: IHistoryService;
    ttsService?: ITextToSpeechService;
    cacheService?: ICacheService;
    offlineService?: IOfflineService;
    notificationService?: INotificationService;
    commandProcessor?: ICommandProcessor;
    logger?: ILoggerService;
}

/**
 * AssistantService - orchestrátor hlasového asistenta.
 * Matchování příkazů, offline fronta a TTS; vykonávání akcí
 * deleguje na CommandProcessor, logování na LoggerService.
 */
export class AssistantService implements IAssistantService {
    private settingsService: ISettingsService;
    private ttsService: ITextToSpeechService;
    private offlineService: IOfflineService;
    private notificationService: INotificationService;
    private logger: ILoggerService;
    private commandProcessor: ICommandProcessor;

    constructor(deps: AssistantServiceDeps = {}) {
        // Constructor injection - umožňuje předat mock implementace v testech
        this.settingsService = deps.settingsService ?? new SettingsService();
        this.ttsService = deps.ttsService ?? new TextToSpeechService();
        this.offlineService = deps.offlineService ?? new OfflineService();
        this.notificationService = deps.notificationService ?? new NotificationService();
        this.logger = deps.logger ?? new LoggerService();
        this.commandProcessor = deps.commandProcessor ?? new CommandProcessor({
            settingsService: this.settingsService,
            taskerService: deps.taskerService ?? new TaskerService(),
            historyService: deps.historyService ?? new HistoryService(),
            cacheService: deps.cacheService ?? new CacheService(),
            notificationService: this.notificationService,
            ttsService: this.ttsService,
            logger: this.logger
        });
    }

    public async processCommand(command: string): Promise<boolean> {
        const lowerCaseCommand = command.toLowerCase();
        const actions = this.settingsService.getActions();

        const matchedAction = actions.find(action =>
            lowerCaseCommand.includes(action.phrase.toLowerCase())
        );

        if (matchedAction) {
            // Check if we're offline
            if (!this.isOnline()) {
                this.offlineService.queueCommand(
                    command,
                    matchedAction.name,
                    matchedAction.type,
                    matchedAction.url,
                    matchedAction.taskName
                );

                if (this.notificationService.isEnabled()) {
                    this.notificationService.showWarning(
                        'Offline režim',
                        `Příkaz "${command}" byl uložen do fronty pro pozdější zpracování.`
                    );
                }

                if (this.ttsService.isEnabled()) {
                    await this.ttsService.speak("Jsem offline. Příkaz byl uložen do fronty.");
                }

                return false;
            }

            if (matchedAction.type === 'webhook') {
                const success = await this.commandProcessor.executeWebhookAction(matchedAction);
                if (success && this.ttsService.isEnabled()) {
                    await this.ttsService.speak(`Akce ${matchedAction.name} byla úspěšně provedena.`);
                }
                return success;
            } else if (matchedAction.type === 'tasker') {
                const success = this.commandProcessor.executeTaskerAction(matchedAction);
                if (success && this.ttsService.isEnabled()) {
                    await this.ttsService.speak(`Akce ${matchedAction.name} byla úspěšně provedena.`);
                }
                return success;
            }
        }

        console.log(`Pro příkaz "${command}" nebyla nalezena žádná akce.`);
        if (this.ttsService.isEnabled()) {
            await this.ttsService.speak("Bohužel jsem nenašel odpovídající akci.");
        }
        return false;
    }

    private isOnline(): boolean {
        try {
            if (global.android) {
                const connectivityManager = global.android.context?.getSystemService(
                    global.android.context?.CONNECTIVITY_SERVICE
                );
                if (connectivityManager) {
                    const networkInfo = connectivityManager.getActiveNetworkInfo();
                    return networkInfo != null && networkInfo.isConnected();
                }
            }
            // Fallback - assume online if we can't check
            return true;
        } catch (error) {
            console.error('Error checking connectivity:', error);
            return true; // Assume online on error
        }
    }

    public async processOfflineQueue(): Promise<{ processed: number; failed: number }> {
        if (this.isOnline()) {
            return this.offlineService.processAllCommands(
                (url: string) => this.commandProcessor.executeWebhookUrl(url),
                (taskName: string) => this.commandProcessor.executeTaskerTaskName(taskName)
            );
        }
        return { processed: 0, failed: 0 };
    }

    public getOfflineQueueCount(): number {
        return this.offlineService.getQueueCount();
    }

    public isOfflineModeActive(): boolean {
        return this.offlineService.isOfflineModeActive();
    }
}
