import { Action, SettingsService } from './settings.service';
import { TaskerService } from './tasker.service';
import { HistoryService } from './history.service';
import { TextToSpeechService } from './text-to-speech.service';
import { CacheService } from './cache.service';
import { OfflineService } from './offline.service';
import { NotificationService } from './notification.service';
import { CommandProcessor } from './command-processor';
import { IntentRecognitionService } from './intent-recognition.service';
import { LoggerService } from '../utils/logger';
import { ErrorHandler } from '../utils/error-handler';
import { Validators, Limits } from '../utils/validation';
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
    IIntentRecognitionService,
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
    intentRecognitionService?: IIntentRecognitionService;
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
    private historyService: IHistoryService;
    private intentRecognitionService: IIntentRecognitionService;
    private commandProcessor: ICommandProcessor;

    constructor(deps: AssistantServiceDeps = {}) {
        // Constructor injection - umožňuje předat mock implementace v testech
        this.settingsService = deps.settingsService ?? new SettingsService();
        this.ttsService = deps.ttsService ?? new TextToSpeechService();
        this.offlineService = deps.offlineService ?? new OfflineService();
        this.notificationService = deps.notificationService ?? new NotificationService();
        this.logger = deps.logger ?? new LoggerService();
        this.historyService = deps.historyService ?? new HistoryService();
        this.intentRecognitionService = deps.intentRecognitionService ?? new IntentRecognitionService();
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

    /**
 * Zpracuje hlasový příkaz: sanitizace, matchování fráze, offline fronta
     * a vykonání přes CommandProcessor (webhook/tasker/ifttt/homeassistant/custom);
     * pokud žádná akce neodpovídá, zkusí rozpoznat záměr (intent recognition)
     * a přečíst odpověď přes TTS.
     * @returns true, pokud byla akce úspěšně vykonána.
     */
    public async processCommand(command: string): Promise<boolean> {
        try {
            // Sanitizace vstupu (odstraňuje řídicí znaky, omezuje délku)
            const sanitizedCommand = Validators.sanitizeText(command, Limits.COMMAND_MAX);
            if (!sanitizedCommand) {
                console.warn('Prázdný nebo neplatný příkaz po sanitizaci.');
                return false;
            }
            const lowerCaseCommand = sanitizedCommand.toLowerCase();
        const actions = this.settingsService.getActions();

        const matchedAction = actions.find(action =>
            lowerCaseCommand.includes(action.phrase.toLowerCase())
        );

        if (matchedAction) {
            // Check if we're offline
            if (!this.isOnline()) {
                // HA/custom akce offline frontu nepodporují (zpracovává jen webhooky/tasker)
                if (matchedAction.type === 'homeassistant' || matchedAction.type === 'custom') {
                    if (this.notificationService.isEnabled()) {
                        this.notificationService.showWarning(
                            'Offline režim',
                            `Akce ${matchedAction.name} vyžaduje připojení k internetu.`
                        );
                    }
                    await this.speakSafely("Jsem offline. Tuto akci lze spustit jen online.");
                    this.historyService.addCommand(
                        sanitizedCommand,
                        matchedAction.name,
                        matchedAction.type,
                        'error',
                        'Akce vyžaduje online připojení'
                    );
                    return false;
                }

                this.offlineService.queueCommand(
                    sanitizedCommand,
                    matchedAction.name,
                    matchedAction.type,
                    matchedAction.url,
                    matchedAction.taskName
                );

                if (this.notificationService.isEnabled()) {
                    this.notificationService.showWarning(
                        'Offline režim',
                        `Příkaz "${sanitizedCommand}" byl uložen do fronty pro pozdější zpracování.`
                    );
                }

                await this.speakSafely("Jsem offline. Příkaz byl uložen do fronty.");

                return false;
            }

            if (matchedAction.type === 'webhook') {
                const success = await this.commandProcessor.executeWebhookAction(matchedAction);
                if (success) {
                    await this.speakSafely(`Akce ${matchedAction.name} byla úspěšně provedena.`);
                }
                return success;
            } else if (matchedAction.type === 'tasker') {
                const success = this.commandProcessor.executeTaskerAction(matchedAction);
                if (success) {
                    await this.speakSafely(`Akce ${matchedAction.name} byla úspěšně provedena.`);
                }
                return success;
            } else if (matchedAction.type === 'ifttt') {
                const success = await this.commandProcessor.executeIftttAction(matchedAction);
                if (success) {
                    await this.speakSafely(`Akce ${matchedAction.name} byla úspěšně provedena.`);
                }
                return success;
            } else if (matchedAction.type === 'homeassistant') {
                const success = await this.commandProcessor.executeHomeAssistantAction(matchedAction);
                if (success) {
                    await this.speakSafely(`Akce ${matchedAction.name} byla úspěšně provedena.`);
                }
                return success;
            } else if (matchedAction.type === 'custom') {
                return this.commandProcessor.executeCustomAction(matchedAction);
            }
        }

        // Fallback: rozpoznání záměru (P4 AI/ML intent recognition)
        const recognizedIntent = this.intentRecognitionService.recognize(sanitizedCommand);
        if (recognizedIntent) {
            console.log(`Rozpoznan záměr "${recognizedIntent.intent}" pro příkaz "${sanitizedCommand}".`);
            this.historyService.addCommand(
                sanitizedCommand,
                `intent:${recognizedIntent.intent}`,
                'intent',
                'success'
            );
            await this.speakSafely(recognizedIntent.response);
            return true;
        }

        console.log(`Pro příkaz "${sanitizedCommand}" nebyla nalezena žádná akce.`);
        await this.speakSafely("Bohužel jsem nenašel odpovídající akci.");
        return false;
        } catch (error) {
            const message = ErrorHandler.handle('AssistantService.processCommand', error);
            if (this.notificationService.isEnabled()) {
                this.notificationService.showError('Chyba', `Při zpracování příkazu došlo k chybě: ${message}`);
            }
            return false;
        }
    }

    private isOnline(): boolean {
        try {
            const g: any = global;
            if (g.android) {
                const connectivityManager = g.android.context?.getSystemService(
                    g.android.context?.CONNECTIVITY_SERVICE
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

    /**
     * Zpracuje čekající offline frontu (při obnoveném připojení).
     * @returns Počet zpracovaných a selhaných příkazů.
     */
    public async processOfflineQueue(): Promise<{ processed: number; failed: number }> {
        try {
            if (this.isOnline()) {
                return await this.offlineService.processAllCommands(
                    (url: string) => this.commandProcessor.executeWebhookUrl(url),
                    (taskName: string) => this.commandProcessor.executeTaskerTaskName(taskName)
                );
            }
        } catch (error) {
            ErrorHandler.handle('AssistantService.processOfflineQueue', error);
        }
        return { processed: 0, failed: 0 };
    }

    /** Počet příkazů čekajících v offline frontě. */
    public getOfflineQueueCount(): number {
        return this.offlineService.getQueueCount();
    }

    /** Zjistí, zda je offline režim aktivní (fronta není prázdná). */
    public isOfflineModeActive(): boolean {
        return this.offlineService.isOfflineModeActive();
    }

    /**
     * Bezpečné TTS oznámení - chyba TTS nesmí přerušit zpracování příkazu.
     */
    private async speakSafely(text: string): Promise<void> {
        try {
            if (this.ttsService?.isEnabled?.()) {
                await this.ttsService.speak(text);
            }
        } catch (error) {
            ErrorHandler.handle('AssistantService.speakSafely', error);
        }
    }
}
