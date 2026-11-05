/**
 * Interface pro služby - umožňují programovat proti abstrakci,
 * ne proti konkrétním třídám (usnadňuje testování a DI).
 */
import { Action, WebhookAuth } from './settings.service';
import { CommandStatus } from './history.service';
import { RecognizedIntent } from './intent-recognition.service';

export interface ISettingsService {
    getActions(): Action[];
    getWebhookAuth(): WebhookAuth;
    getSettings(): any;
}

export interface ITaskerService {
    executeTask(taskName: string): boolean;
}

export interface IHistoryService {
    addCommand(phrase: string, name: string, type: string, status: CommandStatus, errorMessage?: string): void;
}

export interface ITextToSpeechService {
    isEnabled(): boolean;
    speak(text: string): Promise<boolean | void>;
}

export interface ICacheService {
    getWebhookCache(url: string): any;
    setWebhookCache(url: string, data: any, ttlMs: number): void;
}

export interface IOfflineService {
    queueCommand(command: string, name: string, type: string, url?: string, taskName?: string): void;
    processAllCommands(
        webhookExecutor: (url: string) => Promise<boolean>,
        taskerExecutor: (taskName: string) => boolean
    ): Promise<{ processed: number; failed: number }>;
    getQueueCount(): number;
    isOfflineModeActive(): boolean;
}

export interface INotificationService {
    isEnabled(): boolean;
    showSuccess(title: string, message: string): void;
    showError(title: string, message: string): void;
    showWarning(title: string, message: string): void;
}

export interface IAssistantService {
    processCommand(command: string): Promise<boolean>;
    processOfflineQueue(): Promise<{ processed: number; failed: number }>;
    getOfflineQueueCount(): number;
    isOfflineModeActive(): boolean;
}

export interface ILoggerService {
    info(message: string): void;
    success(message: string): void;
    error(message: string): void;
    networkError(message: string): void;
}

export interface IIntentRecognitionService {
    /** Rozpozná záměr příkazu; null pro neznámý příkaz. */
    recognize(command: string): RecognizedIntent | null;
}

export interface ICommandProcessor {
    /** Spustí webhook akci (cache, historie, notifikace). */
    executeWebhookAction(action: Action): Promise<boolean>;
    /** Spustí Tasker akci (historie, notifikace). */
    executeTaskerAction(action: Action): boolean;
    /** Spustí IFTTT událost přes Maker Webhooks (cache, historie, notifikace). */
    executeIftttAction(action: Action): Promise<boolean>;
    /** Zavolá službu Home Assistant REST API (cache, historie, notifikace). */
    executeHomeAssistantAction(action: Action): Promise<boolean>;
    /** Vykoná vlastní příkaz – jen TTS odpověď (historie, notifikace). */
    executeCustomAction(action: Action): boolean;
    /** Zavolá webhook URL s autentizací (offline fronta). */
    executeWebhookUrl(url: string): Promise<boolean>;
    /** Spustí Tasker úlohu podle názvu (offline fronta). */
    executeTaskerTaskName(taskName: string): boolean;
}
