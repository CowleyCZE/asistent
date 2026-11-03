/**
 * Interface pro služby - umožňují programovat proti abstrakci,
 * ne proti konkrétním třídám (usnadňuje testování a DI).
 */
import { Action, WebhookAuth } from './settings.service';
import { CommandStatus } from './history.service';

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
    speak(text: string): Promise<void>;
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
