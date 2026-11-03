/**
 * CommandProcessor - zpracovává konkrétní typy akcí (webhook, tasker).
 * Vyčleněno z AssistantService pro menší a testovatelnější třídy.
 */
import { Action, WebhookAuth, SettingsService } from './settings.service';
import { CommandStatus, HistoryService } from './history.service';
import { TaskerService } from './tasker.service';
import { CacheService } from './cache.service';
import { NotificationService } from './notification.service';
import { TextToSpeechService } from './text-to-speech.service';
import { LoggerService } from '../utils/logger';
import { ErrorHandler } from '../utils/error-handler';
import {
    ISettingsService,
    ITaskerService,
    IHistoryService,
    ICacheService,
    INotificationService,
    ITextToSpeechService,
    ILoggerService,
    ICommandProcessor
} from './service-interfaces';

export interface CommandProcessorDeps {
    settingsService?: ISettingsService;
    taskerService?: ITaskerService;
    historyService?: IHistoryService;
    cacheService?: ICacheService;
    notificationService?: INotificationService;
    ttsService?: ITextToSpeechService;
    logger?: ILoggerService;
}

export class CommandProcessor implements ICommandProcessor {
    private settingsService: ISettingsService;
    private taskerService: ITaskerService;
    private historyService: IHistoryService;
    private cacheService: ICacheService;
    private notificationService: INotificationService;
    private ttsService: ITextToSpeechService;
    private logger: ILoggerService;

    constructor(deps: CommandProcessorDeps = {}) {
        this.settingsService = deps.settingsService ?? new SettingsService();
        this.taskerService = deps.taskerService ?? new TaskerService();
        this.historyService = deps.historyService ?? new HistoryService();
        this.cacheService = deps.cacheService ?? new CacheService();
        this.notificationService = deps.notificationService ?? new NotificationService();
        this.ttsService = deps.ttsService ?? new TextToSpeechService();
        this.logger = deps.logger ?? new LoggerService();
    }

    /** Spustí Tasker úlohu definovanou akcí (včetně historie, notifikací a logu). */
    public executeTaskerAction(action: Action): boolean {
        console.log(`Příkaz nalezen: "${action.name}". Spouštím úlohu v Taskeru: ${action.taskName}`);
        const success = this.taskerService.executeTask(action.taskName);
        const status: CommandStatus = success ? 'success' : 'error';
        this.historyService.addCommand(
            action.phrase,
            action.name,
            'tasker',
            status,
            success ? undefined : `Nepodařilo se spustit úlohu: ${action.taskName}`
        );

        if (success) {
            this.logger.success(`Spuštěna úloha v Taskeru: ${action.name} - ${action.taskName}`);
            if (this.notificationService.isEnabled()) {
                this.notificationService.showSuccess(
                    'Úspěch',
                    `Akce ${action.name} byla úspěšně provedena.`
                );
            }
        } else {
            this.logger.error(`Nepodařilo se spustit úlohu v Taskeru: ${action.name} - ${action.taskName}`);
            if (this.notificationService.isEnabled()) {
                this.notificationService.showError(
                    'Chyba',
                    `Nepodařilo se spustit úlohu ${action.name} v Taskeru.`
                );
            }
            if (this.ttsService.isEnabled()) {
                this.ttsService.speak(`Nepodařilo se spustit úlohu ${action.name} v Taskeru.`);
            }
        }
        return success;
    }

    /** Spustí webhook definovaný akcí (cache, historie, notifikace, log). */
    public async executeWebhookAction(action: Action): Promise<boolean> {
        console.log(`Příkaz nalezen: "${action.name}". Volám webhook: ${action.url}`);

        const webhookAuth: WebhookAuth = this.settingsService.getWebhookAuth();

        // Check cache first
        const cachedResponse = this.cacheService.getWebhookCache(action.url);

        if (cachedResponse) {
            console.log(`Using cached response for ${action.url}`);
            this.historyService.addCommand(
                action.phrase,
                action.name,
                'webhook',
                'success'
            );
            return true;
        }

        try {
            const response = await fetch(action.url, this.buildFetchOptions(action.url, webhookAuth));

            if (response.ok) {
                console.log(`Webhook ${action.name} úspěšně zavolán.`);
                this.logger.success(`${action.name} - ${action.url}`);
                this.historyService.addCommand(
                    action.phrase,
                    action.name,
                    'webhook',
                    'success'
                );

                // Cache successful response (5 minut)
                this.cacheService.setWebhookCache(action.url, {
                    status: response.status,
                    statusText: response.statusText
                }, 300000);

                if (this.notificationService.isEnabled()) {
                    this.notificationService.showSuccess(
                        'Úspěch',
                        `Webhook ${action.name} byl úspěšně zavolán.`
                    );
                }

                return true;
            } else {
                console.error(`Chyba při volání webhooku ${action.name}: ${response.statusText}`);
                this.logger.error(`${action.name} - ${response.statusText}`);
                this.historyService.addCommand(
                    action.phrase,
                    action.name,
                    'webhook',
                    'error',
                    response.statusText
                );

                if (this.notificationService.isEnabled()) {
                    this.notificationService.showError(
                        'Chyba webhooku',
                        `Nepodařilo se zavolat webhook ${action.name}: ${response.statusText}`
                    );
                }

                return false;
            }
        } catch (error) {
            console.error(`Chyba sítě při volání webhooku ${action.name}:`, error);
            this.logger.networkError(`${action.name} - ${ErrorHandler.toMessage(error)}`);
            this.historyService.addCommand(
                action.phrase,
                action.name,
                'webhook',
                'network_error',
                ErrorHandler.toMessage(error)
            );

            if (this.notificationService.isEnabled()) {
                this.notificationService.showError(
                    'Síťová chyba',
                    `Chyba sítě při volání webhooku ${action.name}`
                );
            }

            return false;
        }
    }

    /** Zavolá webhook URL s autentizací (používá se pro offline frontu). */
    public async executeWebhookUrl(url: string): Promise<boolean> {
        try {
            const webhookAuth: WebhookAuth = this.settingsService.getWebhookAuth();
            const response = await fetch(url, this.buildFetchOptions(url, webhookAuth));
            return response.ok;
        } catch {
            return false;
        }
    }

    /** Spustí Tasker úlohu podle názvu (používá se pro offline frontu). */
    public executeTaskerTaskName(taskName: string): boolean {
        return this.taskerService.executeTask(taskName);
    }

    /** Sestaví fetch options včetně API klíče a HMAC podpisu. */
    private buildFetchOptions(url: string, webhookAuth: WebhookAuth): RequestInit {
        const fetchOptions: RequestInit = {
            method: 'POST',
            headers: {}
        };

        if (webhookAuth.apiKey) {
            fetchOptions.headers = {
                ...fetchOptions.headers,
                'X-API-Key': webhookAuth.apiKey
            };
        }

        if (webhookAuth.useHmac && webhookAuth.hmacSecret) {
            const timestamp = Date.now().toString();
            const message = `${url}:${timestamp}`;
            const signature = this.generateHmacSignature(message, webhookAuth.hmacSecret);
            fetchOptions.headers = {
                ...fetchOptions.headers,
                'X-HMAC-Signature': signature,
                'X-HMAC-Timestamp': timestamp
            };
        }

        return fetchOptions;
    }

    private generateHmacSignature(message: string, secret: string): string {
        const crypto = require('crypto');
        const hmac = crypto.createHmac('sha256', secret);
        hmac.update(message);
        return hmac.digest('hex');
    }
}
